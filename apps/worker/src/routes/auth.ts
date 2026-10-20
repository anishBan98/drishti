import type { Context, Hono } from 'hono';
import type { AppEnv, Env } from '../env';
import { apiError } from '../lib/errors';
import { verifyIdToken } from '../lib/google';
import { requireRole } from '../lib/rbac';
import {
  clearSessionCookies,
  createSession,
  findSession,
  randomToken,
  revokeSessions,
  sessionIdFrom,
  setSessionCookies,
  sha256Hex,
  csrfOk,
  type Role,
} from '../lib/session';

// Sign-in and session routes (docs/07 §3, docs/05 §7).

export async function ensureWorkspace(env: Env) {
  await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
    .bind(env.WORKSPACE_ID, 'Your brand', new Date().toISOString())
    .run();
}

/** The user row for an email: the OWNER_EMAIL secret is always Owner (docs/04 §1); others come from the Users tab. */
export async function userFor(env: Env, email: string, name: string) {
  await ensureWorkspace(env);
  const owner = (env.OWNER_EMAIL ?? '').trim().toLowerCase();
  if (owner && email === owner) {
    await env.DB.prepare(
      `INSERT INTO users (id, workspace_id, email, name, role, active, created_at) VALUES (?, ?, ?, ?, 'Owner', 1, ?)
       ON CONFLICT (workspace_id, email) DO UPDATE SET role = 'Owner', active = 1, name = COALESCE(users.name, excluded.name)`,
    )
      .bind(`u_${(await sha256Hex(email)).slice(0, 16)}`, env.WORKSPACE_ID, email, name, new Date().toISOString())
      .run();
  }
  return env.DB.prepare('SELECT id, email, name, role FROM users WHERE workspace_id = ? AND email = ? AND active = 1')
    .bind(env.WORKSPACE_ID, email)
    .first<{ id: string; email: string; name: string | null; role: Role }>();
}

export async function audit(env: Env, actor: string, verb: string, object: string, detail?: unknown) {
  await env.DB.prepare(
    'INSERT INTO audit_log (id, workspace_id, at, actor, verb, object, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      crypto.randomUUID(),
      env.WORKSPACE_ID,
      new Date().toISOString(),
      actor,
      verb,
      object,
      detail ? JSON.stringify(detail) : null,
    )
    .run();
}

async function startSession(c: Context<AppEnv>, user: { id: string; email: string; name: string | null; role: Role }) {
  const csrf = await openSession(c, user);
  return c.json({ user: { email: user.email, name: user.name ?? user.email, role: user.role }, csrf });
}

async function openSession(c: Context<AppEnv>, user: { id: string; email: string; name: string | null; role: Role }) {
  const { id } = await createSession(c.env.DB, user.id);
  const csrf = randomToken(24);
  setSessionCookies(c, id, csrf);
  await c.env.DB.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), user.id)
    .run();
  await audit(c.env, user.email, 'login', 'session');
  return csrf;
}

export function authRoutes(app: Hono<AppEnv>) {
  // Public: the OAuth client ID for the Sign in with Google button (it is not a secret).
  app.get('/api/auth/config', (c) => c.json({ client_id: c.env.GOOGLE_CLIENT_ID || null }));

  app.post('/api/auth/google', async (c) => {
    const body = await c.req.json<{ credential?: string }>().catch(() => ({}) as { credential?: string });
    if (!body.credential) return apiError(c, 401, 'AUTH_TOKEN_INVALID');
    const who = await verifyIdToken(body.credential, { clientId: c.env.GOOGLE_CLIENT_ID, kv: c.env.KV });
    if (typeof who === 'string') return apiError(c, who === 'AUTH_EMAIL_UNVERIFIED' ? 403 : 401, who);
    const user = await userFor(c.env, who.email, who.name);
    if (!user) return apiError(c, 403, 'AUTH_NOT_INVITED', { email: who.email });
    return startSession(c, user);
  });

  // Redirect mode (no popup): Google posts the ID token as a form, then the browser lands on /app. Works in embedded
  // browsers and on phones, where the popup cannot report back. The ID token is verified the same way.
  app.post('/api/auth/google/redirect', async (c) => {
    const form = await c.req.parseBody().catch(() => ({}) as Record<string, string>);
    const credential = typeof form.credential === 'string' ? form.credential : '';
    const fail = (code: string) => c.redirect(`/signin?error=${code}`, 303);
    // Google's double-submit token, checked when the browser sent the cookie back.
    const cookie = /(?:^|;\s*)g_csrf_token=([^;]+)/.exec(c.req.header('cookie') ?? '')?.[1];
    if (!credential || (cookie && cookie !== form.g_csrf_token)) return fail('AUTH_TOKEN_INVALID');
    const who = await verifyIdToken(credential, { clientId: c.env.GOOGLE_CLIENT_ID, kv: c.env.KV });
    if (typeof who === 'string') return fail(who);
    const user = await userFor(c.env, who.email, who.name);
    if (!user) return fail('AUTH_NOT_INVITED');
    await openSession(c, user);
    return c.redirect('/app', 303);
  });

  app.post('/api/auth/logout', async (c) => {
    const raw = sessionIdFrom(c);
    if (raw && csrfOk(c)) {
      await c.env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id_hash = ?')
        .bind(new Date().toISOString(), await sha256Hex(raw))
        .run();
    }
    clearSessionCookies(c);
    return c.body(null, 204);
  });

  app.get('/api/me', async (c) => {
    const raw = sessionIdFrom(c);
    const user = raw ? await findSession(c.env.DB, raw) : null;
    if (!user) return apiError(c, 401, 'AUTH_SESSION_EXPIRED');
    await ensureWorkspace(c.env);
    const ws = await c.env.DB.prepare(
      'SELECT name, sheet_id, inbox_folder_id, outbox_folder_id, archive_folder_id FROM workspaces WHERE id = ?',
    )
      .bind(c.env.WORKSPACE_ID)
      .first<{
        name: string;
        sheet_id: string | null;
        inbox_folder_id: string | null;
        outbox_folder_id: string | null;
      }>();
    const shopify = await c.env.DB.prepare("SELECT 1 FROM connectors WHERE workspace_id = ? AND kind = 'shopify'")
      .bind(c.env.WORKSPACE_ID)
      .first()
      .catch(() => null);
    const synced = await c.env.DB.prepare("SELECT 1 FROM sync_runs WHERE workspace_id = ? AND status = 'ok' LIMIT 1")
      .bind(c.env.WORKSPACE_ID)
      .first()
      .catch(() => null);
    const onboarding = {
      sheet: !!ws?.sheet_id,
      inbox: !!ws?.inbox_folder_id,
      outbox: !!ws?.outbox_folder_id,
      shopify: !!shopify,
      first_sync: !!synced,
    };
    return c.json({
      user: { email: user.email, name: user.name, role: user.role },
      workspace: { name: ws?.name ?? 'Your brand', configured: onboarding.sheet && onboarding.inbox, onboarding },
      theme_hint: null,
    });
  });

  app.post('/api/extension/token', requireRole('capture_token'), async (c) => {
    const user = c.get('user');
    const { id, expiresAt } = await createSession(c.env.DB, user.id, 'capture', 30);
    await audit(c.env, user.email, 'create', 'capture_token');
    return c.json({ token: id, expires_at: expiresAt });
  });

  app.post('/api/admin/sessions/revoke', requireRole('admin'), async (c) => {
    const body = await c.req
      .json<{ user_email?: string; all?: boolean }>()
      .catch(() => ({}) as { user_email?: string; all?: boolean });
    if (body.all) await revokeSessions(c.env.DB, { all: true });
    else if (body.user_email) {
      const u = await c.env.DB.prepare('SELECT id FROM users WHERE workspace_id = ? AND email = ?')
        .bind(c.env.WORKSPACE_ID, body.user_email.toLowerCase())
        .first<{ id: string }>();
      if (!u) return apiError(c, 404, 'NOT_FOUND');
      await revokeSessions(c.env.DB, { userId: u.id });
    } else return apiError(c, 400, 'VALIDATION_FAILED', { fields: 'user_email or all' });
    await audit(c.env, c.get('user').email, 'revoke', 'sessions', body);
    return c.body(null, 204);
  });

  // Staging only (docs/14 §6): signed-in E2E without Google. Never registered in production.
  if (typeof __DRISHTI_TEST_LOGIN__ === 'undefined' || __DRISHTI_TEST_LOGIN__)
    app.post('/api/test/login', async (c) => {
      if (c.env.ENVIRONMENT !== 'staging' || !c.env.E2E_SECRET) return apiError(c, 404, 'NOT_FOUND');
      if (c.req.header('x-e2e-secret') !== c.env.E2E_SECRET) return apiError(c, 404, 'NOT_FOUND');
      const body = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string });
      const user = body.email ? await userFor(c.env, body.email.toLowerCase(), body.email) : null;
      if (!user) return apiError(c, 403, 'AUTH_NOT_INVITED', { email: body.email ?? '' });
      return startSession(c, user);
    });
}

/** Replaced at build time by wrangler `define`: false in production, so the test login is not in that build at all. */
declare const __DRISHTI_TEST_LOGIN__: boolean;
