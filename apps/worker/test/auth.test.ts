import { env, exports } from 'cloudflare:workers';
import { app } from '../src/index';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GOOGLE_JWKS_URL, verifyIdToken } from '../src/lib/google';

// API-01 (ID tokens), API-02 (cookies and CSRF), API-03 (roles) — docs/12 §2.

const CLIENT = env.GOOGLE_CLIENT_ID;
const b64url = (s: string | Uint8Array) =>
  btoa(typeof s === 'string' ? s : String.fromCharCode(...s))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

let keys: CryptoKeyPair;
let jwk: JsonWebKey & { kid: string };
beforeAll(async () => {
  keys = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  jwk = { ...((await crypto.subtle.exportKey('jwk', keys.publicKey)) as JsonWebKey), kid: 'k1' };
});

async function idToken(claims: Record<string, unknown>, kid = 'k1') {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: CLIENT,
      sub: '123',
      email: 'owner@lumora.example',
      email_verified: true,
      name: 'Aditi',
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(`${head}.${body}`)),
  );
  return `${head}.${body}.${b64url(sig)}`;
}

/** Google's key endpoint, faked: serves our test public key. */
const jwksFetch = (async (url: string) =>
  url === GOOGLE_JWKS_URL
    ? new Response(JSON.stringify({ keys: [jwk] }))
    : new Response('no', { status: 404 })) as unknown as typeof fetch;

afterEach(() => vi.restoreAllMocks());

describe('API-01 Google ID tokens', () => {
  const verify = (t: string) => verifyIdToken(t, { clientId: CLIENT, kv: env.KV, fetcher: jwksFetch });
  it('accepts a valid token', async () => {
    expect(await verify(await idToken({}))).toEqual({ email: 'owner@lumora.example', name: 'Aditi', sub: '123' });
  });
  it('rejects a wrong audience, an expired token, a bad signature and an unknown key', async () => {
    expect(await verify(await idToken({ aud: 'someone-else' }))).toBe('AUTH_TOKEN_INVALID');
    expect(await verify(await idToken({ exp: Math.floor(Date.now() / 1000) - 3600 }))).toBe('AUTH_TOKEN_INVALID');
    expect(await verify(await idToken({ iss: 'https://evil.example' }))).toBe('AUTH_TOKEN_INVALID');
    const t = await idToken({});
    expect(await verify(t.slice(0, -4) + 'AAAA')).toBe('AUTH_TOKEN_INVALID');
    expect(await verify(await idToken({}, 'other-kid'))).toBe('AUTH_TOKEN_INVALID');
    expect(await verify('not.a.token')).toBe('AUTH_TOKEN_INVALID');
  });
  it('rejects an unverified email with its own code', async () => {
    expect(await verify(await idToken({ email_verified: false }))).toBe('AUTH_EMAIL_UNVERIFIED');
  });
});

const call = (path: string, init: RequestInit = {}) =>
  exports.default.fetch(new Request(`https://drishti.test${path}`, init));
const cookiesOf = (res: Response) => res.headers.getSetCookie();
const jar = (res: Response) =>
  cookiesOf(res)
    .map((c) => c.split(';')[0])
    .join('; ');

async function loginAs(email: string) {
  const res = await call('/api/test/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-e2e-secret': env.E2E_SECRET! },
    body: JSON.stringify({ email }),
  });
  const body = await res.json<{ csrf: string; user: { role: string } }>();
  return { res, cookie: jar(res), csrf: body.csrf, role: body.user?.role };
}

async function addUser(email: string, role: string) {
  await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
    .bind('default', 'Lumora', new Date().toISOString())
    .run();
  await env.DB.prepare(
    'INSERT OR REPLACE INTO users (id, workspace_id, email, name, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
  )
    .bind(`u_${role}`, 'default', email, role, role, new Date().toISOString())
    .run();
}

describe('API-02 sign-in, cookies and CSRF', () => {
  it('signs in the owner with a Google token and sets secure cookies', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(jwksFetch as never);
    const res = await call('/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential: await idToken({}) }),
    });
    expect(res.status).toBe(200);
    expect((await res.json<{ user: { role: string } }>()).user.role).toBe('Owner');
    const set = cookiesOf(res);
    const session = set.find((c) => c.startsWith('__Host-drishti='))!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/Secure/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/Path=\//i);
    const csrf = set.find((c) => c.startsWith('drishti-csrf='))!;
    expect(csrf).not.toMatch(/HttpOnly/i);
  });

  it('says who is not invited', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(jwksFetch as never);
    const res = await call('/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential: await idToken({ email: 'stranger@example.com' }) }),
    });
    expect(res.status).toBe(403);
    expect((await res.json<{ error: { code: string; message: string } }>()).error.message).toContain(
      'stranger@example.com',
    );
  });

  it('refuses a non-GET request without the CSRF header, and accepts it with one', async () => {
    const { cookie, csrf } = await loginAs('owner@lumora.example');
    const without = await call('/api/extension/token', { method: 'POST', headers: { cookie } });
    expect(without.status).toBe(403);
    expect((await without.json<{ error: { code: string } }>()).error.code).toBe('CSRF_INVALID');
    const ok = await call('/api/extension/token', { method: 'POST', headers: { cookie, 'x-csrf-token': csrf } });
    expect(ok.status).toBe(200);
  });

  it('logout revokes the session', async () => {
    const { cookie, csrf } = await loginAs('owner@lumora.example');
    expect((await call('/api/me', { headers: { cookie } })).status).toBe(200);
    expect((await call('/api/auth/logout', { method: 'POST', headers: { cookie, 'x-csrf-token': csrf } })).status).toBe(
      204,
    );
    expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
  });
});

describe('API-03 roles', () => {
  const ROUTES: { method: string; path: string; body?: unknown; allowed: string[] }[] = [
    { method: 'GET', path: '/api/me', allowed: ['Owner', 'Approver', 'Analyst', 'Editor', 'Viewer'] },
    { method: 'POST', path: '/api/extension/token', allowed: ['Owner', 'Approver', 'Analyst', 'Editor'] },
    {
      method: 'POST',
      path: '/api/admin/sessions/revoke',
      body: { user_email: 'nobody-here@lumora.example' },
      allowed: ['Owner'],
    },
  ];
  const ROLES = ['Owner', 'Approver', 'Analyst', 'Editor', 'Viewer'];

  it.each(ROLES)('%s gets exactly the routes its role allows', async (role) => {
    const email = role === 'Owner' ? 'owner@lumora.example' : `${role.toLowerCase()}@lumora.example`;
    if (role !== 'Owner') await addUser(email, role);
    const { cookie, csrf } = await loginAs(email);
    for (const r of ROUTES) {
      const res = await call(r.path, {
        method: r.method,
        headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
        ...(r.body ? { body: JSON.stringify(r.body) } : {}),
      });
      const allowed = r.allowed.includes(role);
      // Allowed requests may still fail on their own terms (404 for an unknown user), but never with 401/403.
      if (allowed) expect([401, 403], `${role} ${r.path}`).not.toContain(res.status);
      else {
        expect(res.status, `${role} ${r.path}`).toBe(403);
        expect((await res.json<{ error: { code: string } }>()).error.code).toBe('ROLE_FORBIDDEN');
      }
    }
  });

  it('the test login answers 404 outside staging and without the secret', async () => {
    const bad = await call('/api/test/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e2e-secret': 'wrong' },
      body: JSON.stringify({ email: 'owner@lumora.example' }),
    });
    expect(bad.status).toBe(404);
    const { app } = await import('../src/index');
    const prod = await app.request(
      '/api/test/login',
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-e2e-secret': env.E2E_SECRET! }, body: '{}' },
      { ...env, ENVIRONMENT: 'production' },
    );
    expect(prod.status).toBe(404);
  });
});

describe('sign-in redirect mode', () => {
  it('sends a bad or forged form back to Sign in with the error', async () => {
    const post = (body: string, cookie = '') =>
      app.request(
        'https://drishti.test/api/auth/google/redirect',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) },
          body,
        },
        env,
      );
    const empty = await post('g_csrf_token=a');
    expect(empty.status).toBe(303);
    expect(empty.headers.get('location')).toBe('/signin?error=AUTH_TOKEN_INVALID');
    const forged = await post('credential=x.y.z&g_csrf_token=a', 'g_csrf_token=b');
    expect(forged.headers.get('location')).toBe('/signin?error=AUTH_TOKEN_INVALID');
  });
});
