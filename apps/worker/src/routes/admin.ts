import type { Hono } from 'hono';
import type { AppEnv, Env } from '../env';
import { apiError } from '../lib/errors';
import { serviceAccountEmail, serviceAccountToken } from '../lib/google';
import { requireRole } from '../lib/rbac';
import type { Role } from '../lib/session';
import { audit, ensureWorkspace } from './auth';

// Admin (docs/04 §4, docs/07 §6): workspace links with live access checks through the service account, users from
// the Users tab, usage against free limits, and the audit log. Google calls go through `fetcher` so tests can fake them.

const ROLES: Role[] = ['Owner', 'Approver', 'Analyst', 'Editor', 'Viewer'];

/** "https://docs.google.com/spreadsheets/d/<id>/…" or "https://drive.google.com/drive/folders/<id>" → the ID. */
export function idFromUrl(url: string | undefined, kind: 'sheet' | 'folder'): string | null {
  if (!url) return null;
  const m =
    kind === 'sheet'
      ? /docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(url)
      : /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|open\?id=)([A-Za-z0-9_-]{15,})/.exec(url);
  return m?.[1] ?? null;
}

type Check =
  { ok: true; name: string } | { ok: false; code: 'SHEET_NOT_SHARED' | 'DRIVE_NOT_SHARED' | 'VALIDATION_FAILED' };

async function checkSheet(token: string, id: string, fetcher: typeof fetch): Promise<Check> {
  const res = await fetcher(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.title`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, code: 'SHEET_NOT_SHARED' };
  return { ok: true, name: ((await res.json()) as { properties?: { title?: string } }).properties?.title ?? '' };
}

async function checkFolder(token: string, id: string, fetcher: typeof fetch): Promise<Check> {
  const res = await fetcher(
    `https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { ok: false, code: 'DRIVE_NOT_SHARED' };
  const f = (await res.json()) as { name?: string; mimeType?: string; capabilities?: { canAddChildren?: boolean } };
  // Drishti writes into the folders, so Editor access is needed (a Viewer share cannot add files).
  if (f.mimeType !== 'application/vnd.google-apps.folder' || f.capabilities?.canAddChildren === false)
    return { ok: false, code: 'DRIVE_NOT_SHARED' };
  return { ok: true, name: f.name ?? '' };
}

/** The Users tab (email, role, name) → active users; OWNER_EMAIL stays Owner; people no longer listed are deactivated. */
export async function reloadUsers(
  env: Env,
  fetcher: typeof fetch,
): Promise<{ ok: true; count: number } | { ok: false; code: string }> {
  const ws = await env.DB.prepare('SELECT sheet_id FROM workspaces WHERE id = ?')
    .bind(env.WORKSPACE_ID)
    .first<{ sheet_id: string | null }>();
  if (!ws?.sheet_id || !env.GOOGLE_SA_JSON) return { ok: false, code: 'SHEET_NOT_SHARED' };
  const token = await serviceAccountToken(env.GOOGLE_SA_JSON, { kv: env.KV, fetcher });
  if (!token) return { ok: false, code: 'SHEET_NOT_SHARED' };
  const res = await fetcher(`https://sheets.googleapis.com/v4/spreadsheets/${ws.sheet_id}/values/Users!A1:C500`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, code: 'SHEET_NOT_SHARED' };
  const [head = [], ...rows] = ((await res.json()) as { values?: string[][] }).values ?? [];
  const col = (n: string) => head.findIndex((h) => h.trim().toLowerCase() === n);
  const [ei, ri, ni] = [col('email'), col('role'), col('name')];
  const owner = (env.OWNER_EMAIL ?? '').trim().toLowerCase();
  const now = new Date().toISOString();
  const seen = new Set<string>();
  for (const r of rows) {
    const email = (r[ei] ?? '').trim().toLowerCase();
    const role = ROLES.find((x) => x.toLowerCase() === (r[ri] ?? '').trim().toLowerCase());
    if (!email || !role) continue;
    seen.add(email);
    await env.DB.prepare(
      `INSERT INTO users (id, workspace_id, email, name, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (workspace_id, email) DO UPDATE SET role = excluded.role, name = excluded.name, active = 1`,
    )
      .bind(
        `u_${crypto.randomUUID().slice(0, 16)}`,
        env.WORKSPACE_ID,
        email,
        (r[ni] ?? '').trim() || email,
        email === owner ? 'Owner' : role,
        now,
      )
      .run();
  }
  // Removed from the tab: deactivated (their sessions stop working), except the bootstrap owner.
  const existing = await env.DB.prepare('SELECT email FROM users WHERE workspace_id = ? AND active = 1')
    .bind(env.WORKSPACE_ID)
    .all<{ email: string }>();
  for (const u of existing.results)
    if (!seen.has(u.email) && u.email !== owner)
      await env.DB.prepare('UPDATE users SET active = 0 WHERE workspace_id = ? AND email = ?')
        .bind(env.WORKSPACE_ID, u.email)
        .run();
  return { ok: true, count: seen.size };
}

export function adminRoutes(app: Hono<AppEnv>, fetcher: () => typeof fetch = () => fetch) {
  app.get('/api/admin/workspace', requireRole('admin'), async (c) => {
    await ensureWorkspace(c.env);
    const ws = await c.env.DB.prepare(
      'SELECT name, sheet_id, inbox_folder_id, outbox_folder_id, archive_folder_id, settings_json FROM workspaces WHERE id = ?',
    )
      .bind(c.env.WORKSPACE_ID)
      .first();
    const connectors = await c.env.DB.prepare('SELECT kind, status, checked_at FROM connectors WHERE workspace_id = ?')
      .bind(c.env.WORKSPACE_ID)
      .all();
    return c.json({
      workspace: ws,
      service_account: serviceAccountEmail(c.env.GOOGLE_SA_JSON),
      connectors: connectors.results,
    });
  });

  app.put('/api/admin/workspace', requireRole('admin'), async (c) => {
    const body = await c.req
      .json<{ sheet_url?: string; inbox_url?: string; outbox_url?: string; archive_url?: string }>()
      .catch(() => ({}) as Record<string, string>);
    const ids = {
      sheet: idFromUrl(body.sheet_url, 'sheet'),
      inbox: idFromUrl(body.inbox_url, 'folder'),
      outbox: idFromUrl(body.outbox_url, 'folder'),
      archive: body.archive_url ? idFromUrl(body.archive_url, 'folder') : null,
    };
    const missing = [
      !ids.sheet && 'sheet_url',
      !ids.inbox && 'inbox_url',
      !ids.outbox && 'outbox_url',
      body.archive_url && !ids.archive && 'archive_url',
    ].filter(Boolean);
    if (missing.length) return apiError(c, 400, 'VALIDATION_FAILED', { fields: missing.join(', ') });
    const saEmail = serviceAccountEmail(c.env.GOOGLE_SA_JSON);
    if (!saEmail || !c.env.GOOGLE_SA_JSON)
      return apiError(c, 422, 'CONNECTOR_MISSING', {
        connector: 'The Google service account',
        fallback_text: 'Set GOOGLE_SA_JSON (runbook §5).',
      });
    const f = fetcher();
    const token = await serviceAccountToken(c.env.GOOGLE_SA_JSON, { kv: c.env.KV, fetcher: f });
    if (!token) return apiError(c, 422, 'SHEET_NOT_SHARED', { sa_email: saEmail });
    // Live checks, each reported with its own fix (docs/09 §6.10 step 4).
    const checks = {
      sheet: await checkSheet(token, ids.sheet!, f),
      inbox: await checkFolder(token, ids.inbox!, f),
      outbox: await checkFolder(token, ids.outbox!, f),
      ...(ids.archive ? { archive: await checkFolder(token, ids.archive, f) } : {}),
    };
    const results = Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [
        k,
        v.ok
          ? { ok: true, name: v.name }
          : {
              ok: false,
              code: v.code,
              message:
                v.code === 'SHEET_NOT_SHARED'
                  ? `Drishti can't open your Workspace Sheet. Share it with ${saEmail} as Editor.`
                  : `Drishti can't open the ${k} folder. Share it with ${saEmail} as Editor.`,
            },
      ]),
    );
    const allOk = Object.values(checks).every((v) => v.ok);
    if (allOk) {
      await ensureWorkspace(c.env);
      await c.env.DB.prepare(
        'UPDATE workspaces SET sheet_id = ?, inbox_folder_id = ?, outbox_folder_id = ?, archive_folder_id = COALESCE(?, archive_folder_id) WHERE id = ?',
      )
        .bind(ids.sheet, ids.inbox, ids.outbox, ids.archive, c.env.WORKSPACE_ID)
        .run();
      await audit(c.env, c.get('user').email, 'update', 'workspace_links', ids);
    }
    return c.json({ ok: allOk, service_account: saEmail, checks: results }, allOk ? 200 : 422);
  });

  app.get('/api/admin/users', requireRole('admin'), async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT email, name, role, active, last_seen_at FROM users WHERE workspace_id = ? ORDER BY active DESC, role, email',
    )
      .bind(c.env.WORKSPACE_ID)
      .all();
    return c.json({ items: rows.results });
  });

  app.post('/api/admin/users/reload', requireRole('admin'), async (c) => {
    const r = await reloadUsers(c.env, fetcher());
    if (!r.ok)
      return apiError(c, 422, 'SHEET_NOT_SHARED', {
        sa_email: serviceAccountEmail(c.env.GOOGLE_SA_JSON) ?? 'the service account',
      });
    await audit(c.env, c.get('user').email, 'reload', 'users', { count: r.count });
    return c.json(r);
  });

  app.get('/api/admin/usage', requireRole('usage'), async (c) => {
    const days = Math.min(90, Math.max(1, Number(c.req.query('days') ?? 14) || 14));
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const rows = await c.env.DB.prepare('SELECT day, metric, value FROM usage_daily WHERE day >= ? ORDER BY day')
      .bind(since)
      .all();
    // Free-plan limits per day (docs/05 §3).
    const limits = {
      worker_requests: 100_000,
      kv_writes: 1_000,
      d1_writes: 100_000,
      ai_neurons: 10_000,
      sheets_calls: 60_000,
    };
    return c.json({ items: rows.results, limits });
  });

  app.get('/api/admin/audit', requireRole('admin'), async (c) => {
    const cursor = c.req.query('cursor') ?? '9999';
    const rows = await c.env.DB.prepare(
      'SELECT at, actor, verb, object, detail_json FROM audit_log WHERE workspace_id = ? AND at < ? ORDER BY at DESC LIMIT 51',
    )
      .bind(c.env.WORKSPACE_ID, cursor)
      .all<{ at: string }>();
    const items = rows.results.slice(0, 50);
    return c.json({ items, next_cursor: rows.results.length > 50 ? items.at(-1)!.at : null });
  });
}
