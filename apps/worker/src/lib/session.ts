import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from '../env';

// Sessions (docs/05 §7): a random 32-byte ID, stored as its SHA-256 in D1 with a 7-day sliding expiry (extended at
// most once a day, so reads do not cost a write each). Cookie `__Host-drishti`: HttpOnly, Secure, SameSite=Lax,
// Path=/. CSRF: double submit — the `drishti-csrf` cookie (readable by the page) must match `X-CSRF-Token` on every
// non-GET request.

export const SESSION_COOKIE = '__Host-drishti';
export const CSRF_COOKIE = 'drishti-csrf';
export const SESSION_DAYS = 7;
const DAY = 86_400_000;

export type Role = 'Owner' | 'Approver' | 'Analyst' | 'Editor' | 'Viewer';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  scope: 'app' | 'capture';
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export const randomToken = (bytes = 32) => {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/** Creates a session row and returns its raw ID (shown to the client once, as a cookie or a token). */
export async function createSession(
  db: D1Database,
  userId: string,
  scope: 'app' | 'capture' = 'app',
  days = SESSION_DAYS,
) {
  const id = randomToken();
  const now = new Date();
  await db
    .prepare('INSERT INTO sessions (id_hash, user_id, scope, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(id), userId, scope, now.toISOString(), new Date(now.getTime() + days * DAY).toISOString())
    .run();
  return { id, expiresAt: new Date(now.getTime() + days * DAY).toISOString() };
}

/** Looks up a live session by its raw ID; slides the expiry forward when it is more than a day old. */
export async function findSession(
  db: D1Database,
  rawId: string,
  scope: 'app' | 'capture' = 'app',
): Promise<SessionUser | null> {
  const idHash = await sha256Hex(rawId);
  const row = await db
    .prepare(
      `SELECT s.id_hash, s.expires_at, s.scope, u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id_hash = ? AND s.revoked_at IS NULL AND u.active = 1`,
    )
    .bind(idHash)
    .first<{ expires_at: string; scope: string; id: string; email: string; name: string | null; role: Role }>();
  if (!row || row.scope !== scope) return null;
  const now = Date.now();
  const expires = Date.parse(row.expires_at);
  if (expires <= now) return null;
  if (scope === 'app' && expires - now < (SESSION_DAYS - 1) * DAY)
    await db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id_hash = ?')
      .bind(new Date(now + SESSION_DAYS * DAY).toISOString(), idHash)
      .run();
  return { id: row.id, email: row.email, name: row.name ?? row.email, role: row.role, scope: row.scope as 'app' };
}

export function setSessionCookies(c: Context<AppEnv>, sessionId: string, csrf: string) {
  const secure = new URL(c.req.url).protocol === 'https:';
  const maxAge = SESSION_DAYS * 86_400;
  // __Host- cookies must be Secure with Path=/ and no Domain; local http development uses a plain name.
  setCookie(c, secure ? SESSION_COOKIE : 'drishti-session', sessionId, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge,
  });
  setCookie(c, CSRF_COOKIE, csrf, { httpOnly: false, secure, sameSite: 'Lax', path: '/', maxAge });
}

export function clearSessionCookies(c: Context<AppEnv>) {
  const secure = new URL(c.req.url).protocol === 'https:';
  deleteCookie(c, secure ? SESSION_COOKIE : 'drishti-session', { path: '/', secure });
  deleteCookie(c, CSRF_COOKIE, { path: '/', secure });
}

export const sessionIdFrom = (c: Context<AppEnv>) => getCookie(c, SESSION_COOKIE) ?? getCookie(c, 'drishti-session');

/** Double-submit CSRF check for non-GET requests. */
export function csrfOk(c: Context<AppEnv>): boolean {
  const cookie = getCookie(c, CSRF_COOKIE);
  const header = c.req.header('x-csrf-token');
  return !!cookie && !!header && cookie.length >= 16 && cookie === header;
}

export async function revokeSessions(db: D1Database, where: { userId?: string; all?: boolean }) {
  const now = new Date().toISOString();
  if (where.all) return db.prepare('UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL').bind(now).run();
  return db
    .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(now, where.userId!)
    .run();
}
