import { GOVERNORS } from '@drishti/shared';
import type { Hono } from 'hono';
import type { AppEnv } from '../env';
import { apiError } from '../lib/errors';
import { serviceAccountEmail, serviceAccountToken } from '../lib/google';
import { requireRole } from '../lib/rbac';
import { audit, ensureWorkspace } from './auth';

// Sync, compact version (docs/05 §6): the Worker reads the Workspace Sheet and the Inbox folder with the service
// account and passes the bytes through; the signed-in browser runs the engine (the free plan's ~10 ms of CPU per
// request cannot build a snapshot) and saves the result here for everyone in the workspace.

const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const GSHEET = 'application/vnd.google-apps.spreadsheet';
const FOLDER = 'application/vnd.google-apps.folder';
const MAX_SNAPSHOT_BYTES = GOVERNORS.snapshotMaxBytes;
const snapshotKey = (ws: string) => `snapshot:${ws}`;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

async function workspaceIds(env: AppEnv['Bindings']) {
  await ensureWorkspace(env);
  return env.DB.prepare('SELECT sheet_id, inbox_folder_id FROM workspaces WHERE id = ?')
    .bind(env.WORKSPACE_ID)
    .first<{ sheet_id: string | null; inbox_folder_id: string | null }>();
}

export function syncRoutes(app: Hono<AppEnv>, fetcher: () => typeof fetch = () => fetch) {
  /** What the next sync will read: the Workspace Sheet and every file in the Inbox folder. */
  app.get('/api/sync/sources', requireRole('sync'), async (c) => {
    const ws = await workspaceIds(c.env);
    if (!ws?.sheet_id || !ws.inbox_folder_id) return apiError(c, 409, 'WORKSPACE_NOT_CONFIGURED');
    const sa = serviceAccountEmail(c.env.GOOGLE_SA_JSON);
    const token = c.env.GOOGLE_SA_JSON
      ? await serviceAccountToken(c.env.GOOGLE_SA_JSON, { kv: c.env.KV, fetcher: fetcher() })
      : null;
    if (!token || !sa) return apiError(c, 422, 'SHEET_NOT_SHARED', { sa_email: sa ?? '' });
    const q = encodeURIComponent(`'${ws.inbox_folder_id}' in parents and trashed = false`);
    const res = await fetcher()(
      `${DRIVE}?q=${q}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return apiError(c, 422, 'DRIVE_NOT_SHARED', { folder: 'the Inbox folder', sa_email: sa });
    const files = ((await res.json()) as { files?: DriveFile[] }).files ?? [];
    return c.json({
      items: [
        { id: ws.sheet_id, name: 'Workspace Sheet', kind: 'sheet' },
        ...files
          .filter((f) => f.mimeType !== FOLDER)
          .map((f) => ({ id: f.id, name: f.name, kind: 'file', size: Number(f.size ?? 0), modified: f.modifiedTime })),
      ],
    });
  });

  /** One source's bytes. Only the Workspace Sheet or a file inside the Inbox folder can be read. */
  app.get('/api/sync/file/:id', requireRole('sync'), async (c) => {
    const id = c.req.param('id');
    if (!/^[\w-]{10,100}$/.test(id)) return apiError(c, 404, 'NOT_FOUND');
    const ws = await workspaceIds(c.env);
    if (!ws?.sheet_id || !ws.inbox_folder_id) return apiError(c, 409, 'WORKSPACE_NOT_CONFIGURED');
    const token = c.env.GOOGLE_SA_JSON
      ? await serviceAccountToken(c.env.GOOGLE_SA_JSON, { kv: c.env.KV, fetcher: fetcher() })
      : null;
    if (!token) return apiError(c, 422, 'SHEET_NOT_SHARED', { sa_email: '' });
    const auth = { headers: { authorization: `Bearer ${token}` } };
    const meta = await fetcher()(`${DRIVE}/${id}?fields=id,name,mimeType,parents&supportsAllDrives=true`, auth);
    if (!meta.ok) return apiError(c, 404, 'NOT_FOUND');
    const f = (await meta.json()) as DriveFile;
    if (id !== ws.sheet_id && !f.parents?.includes(ws.inbox_folder_id)) return apiError(c, 404, 'NOT_FOUND');
    const url =
      f.mimeType === GSHEET
        ? `${DRIVE}/${id}/export?mimeType=${encodeURIComponent(XLSX)}`
        : `${DRIVE}/${id}?alt=media&supportsAllDrives=true`;
    const body = await fetcher()(url, auth);
    if (!body.ok || !body.body) return apiError(c, 502, 'SHEET_FETCH_FAILED');
    return new Response(body.body, {
      headers: {
        'content-type': f.mimeType === GSHEET ? XLSX : 'application/octet-stream',
        'cache-control': 'no-store',
        'x-file-name': encodeURIComponent(f.mimeType === GSHEET ? `${f.name}.xlsx` : f.name),
      },
    });
  });

  /** Save the snapshot the browser built, as the workspace's latest. */
  app.put('/api/snapshot', requireRole('sync'), async (c) => {
    const text = await c.req.text();
    if (text.length > MAX_SNAPSHOT_BYTES) return apiError(c, 413, 'VALIDATION_FAILED', { fields: 'snapshot' });
    let snap: { version?: string; generated_at?: string; data_through?: string };
    try {
      snap = JSON.parse(text) as typeof snap;
    } catch {
      return apiError(c, 400, 'VALIDATION_FAILED', { fields: 'snapshot' });
    }
    if (!snap.version || !snap.generated_at) return apiError(c, 400, 'VALIDATION_FAILED', { fields: 'snapshot' });
    const files = Number(c.req.header('x-files-parsed') ?? 0) || 0;
    const user = c.get('user');
    const now = new Date().toISOString();
    await c.env.KV.put(snapshotKey(c.env.WORKSPACE_ID), text);
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE snapshots SET is_latest = 0 WHERE workspace_id = ?').bind(c.env.WORKSPACE_ID),
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO snapshots (workspace_id, version, generated_at, data_through, bytes, is_latest) VALUES (?, ?, ?, ?, ?, 1)',
      ).bind(c.env.WORKSPACE_ID, snap.version, snap.generated_at, snap.data_through ?? '', text.length),
      c.env.DB.prepare(
        "INSERT INTO sync_runs (id, workspace_id, trigger, requested_by, status, started_at, finished_at, snapshot_version, files_parsed) VALUES (?, ?, 'manual', ?, 'ok', ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), c.env.WORKSPACE_ID, user.email, now, now, snap.version, files),
    ]);
    await audit(c.env, user.email, 'sync', 'snapshot', { version: snap.version, files });
    return c.json({ ok: true, version: snap.version, synced_at: now });
  });

  /** The workspace's latest snapshot, for every signed-in role. */
  app.get('/api/snapshot', requireRole('view'), async (c) => {
    const text = await c.env.KV.get(snapshotKey(c.env.WORKSPACE_ID));
    if (!text) return apiError(c, 404, 'NOT_FOUND');
    return new Response(text, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  });

  /** Recent syncs, for the Data sources footer. */
  app.get('/api/sync/runs', requireRole('view'), async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT trigger, requested_by, status, finished_at, snapshot_version, files_parsed FROM sync_runs WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 10',
    )
      .bind(c.env.WORKSPACE_ID)
      .all();
    return c.json({ items: rows.results });
  });
}
