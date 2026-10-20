// Google Sign-In ID tokens (docs/05 §7, docs/12 API-01): RS256 signature against Google's JWKS (cached in KV for 6 h),
// then iss, aud, exp and email_verified. And service-account access tokens for Sheets and Drive (docs/11 §2).

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const JWKS_KEY = 'google:jwks';
const JWKS_TTL = 6 * 3600;

export interface GoogleIdentity {
  email: string;
  name: string;
  sub: string;
}

export type IdTokenError = 'AUTH_TOKEN_INVALID' | 'AUTH_EMAIL_UNVERIFIED';

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = <T>(s: string): T => JSON.parse(new TextDecoder().decode(b64urlToBytes(s))) as T;

interface Jwk extends JsonWebKey {
  kid?: string;
}

async function jwks(kv: KVNamespace, fetcher: typeof fetch, refresh = false): Promise<Jwk[]> {
  if (!refresh) {
    const cached = await kv.get<{ keys: Jwk[] }>(JWKS_KEY, 'json');
    if (cached?.keys?.length) return cached.keys;
  }
  const res = await fetcher(GOOGLE_JWKS_URL);
  if (!res.ok) return [];
  const body = (await res.json()) as { keys: Jwk[] };
  await kv.put(JWKS_KEY, JSON.stringify(body), { expirationTtl: JWKS_TTL });
  return body.keys ?? [];
}

/** Verifies a Google ID token; returns the identity or the copy-deck error code. */
export async function verifyIdToken(
  token: string,
  opts: { clientId: string; kv: KVNamespace; fetcher?: typeof fetch; now?: number },
): Promise<GoogleIdentity | IdTokenError> {
  const parts = token.split('.');
  if (parts.length !== 3 || !opts.clientId) return 'AUTH_TOKEN_INVALID';
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = b64urlJson(parts[0]!);
    payload = b64urlJson(parts[1]!);
  } catch {
    return 'AUTH_TOKEN_INVALID';
  }
  if (header.alg !== 'RS256' || !header.kid) return 'AUTH_TOKEN_INVALID';
  const fetcher = opts.fetcher ?? fetch;
  let keys = await jwks(opts.kv, fetcher);
  // Google rotates keys: an unknown kid triggers one refresh.
  if (!keys.some((k) => k.kid === header.kid)) keys = await jwks(opts.kv, fetcher, true);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return 'AUTH_TOKEN_INVALID';
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, [
      'verify',
    ]);
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(parts[2]!),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return 'AUTH_TOKEN_INVALID';
  } catch {
    return 'AUTH_TOKEN_INVALID';
  }
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (!ISSUERS.has(String(payload.iss))) return 'AUTH_TOKEN_INVALID';
  const aud = payload.aud;
  if (Array.isArray(aud) ? !aud.includes(opts.clientId) : aud !== opts.clientId) return 'AUTH_TOKEN_INVALID';
  // 60 s of clock skew either way.
  if (typeof payload.exp !== 'number' || payload.exp < now - 60) return 'AUTH_TOKEN_INVALID';
  if (typeof payload.iat === 'number' && payload.iat > now + 60) return 'AUTH_TOKEN_INVALID';
  if (typeof payload.email !== 'string') return 'AUTH_TOKEN_INVALID';
  if (payload.email_verified !== true && payload.email_verified !== 'true') return 'AUTH_EMAIL_UNVERIFIED';
  return {
    email: payload.email.toLowerCase(),
    name: typeof payload.name === 'string' ? payload.name : payload.email,
    sub: String(payload.sub ?? ''),
  };
}

// ---- Service account (Sheets and Drive) ----------------------------------------------------------------------

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const pemToDer = (pem: string) =>
  Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
const b64url = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const SA_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

export function serviceAccountEmail(json: string | undefined): string | null {
  try {
    return json ? (JSON.parse(json) as ServiceAccount).client_email : null;
  } catch {
    return null;
  }
}

/**
 * An access token for the service account: a signed JWT exchanged at Google's token endpoint, cached in KV for
 * 50 minutes (docs/11 §2).
 */
export async function serviceAccountToken(
  json: string,
  opts: { kv: KVNamespace; fetcher?: typeof fetch; scopes?: string },
): Promise<string | null> {
  const sa = JSON.parse(json) as ServiceAccount;
  const cacheKey = `google:sa:${sa.client_email}`;
  const cached = await opts.kv.get(cacheKey);
  if (cached) return cached;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: opts.scopes ?? SA_SCOPES,
      aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  const res = await (opts.fetcher ?? fetch)(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${header}.${claims}.${b64url(sig)}`,
  });
  if (!res.ok) return null;
  const token = ((await res.json()) as { access_token?: string }).access_token ?? null;
  if (token) await opts.kv.put(cacheKey, token, { expirationTtl: 50 * 60 });
  return token;
}
