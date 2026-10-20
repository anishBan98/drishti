import type { Hono } from 'hono';
import type { AppEnv, Env } from '../env';
import { apiError } from '../lib/errors';
import { serviceAccountToken } from '../lib/google';
import { requireRole } from '../lib/rbac';
import { audit, ensureWorkspace } from './auth';

// Action engine, compact version (docs/10 §2): the browser runs an action's steps; every change is saved here, shared
// with the team, mirrored to the Actions tab of the Workspace Sheet, and each generated file is saved to the Drive
// Outbox folder with a link back on the action. Optional Slack post when a webhook is set (docs/10 §6).

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';
const ACTIONS_TAB = 'Actions';
const HEADER = [
  'action_id',
  'created_at',
  'screen',
  'type',
  'title',
  'owner',
  'status',
  'expected_inr',
  'expected_per',
  'measured_inr',
  'readout_date',
  'output_file',
  'notes',
];

interface Output {
  kind: 'download' | 'link';
  label: string;
  filename?: string;
  mime?: string;
  content?: string;
  url?: string;
  /** Set on a download once it is saved to the Outbox. */
  saved?: boolean;
}
interface ActionBody {
  id: string;
  suggestion_id?: string;
  type: string;
  title: string;
  screen: string;
  owner: string;
  status: string;
  executor: string;
  expected_label?: string;
  readout_date?: string;
  outputs?: Output[];
  created_at: string;
  [k: string]: unknown;
}

const DONE = new Set(['waiting_on_user', 'done', 'measuring', 'result']);

async function google(env: Env, fetcher: typeof fetch) {
  if (!env.GOOGLE_SA_JSON) return null;
  const token = await serviceAccountToken(env.GOOGLE_SA_JSON, { kv: env.KV, fetcher }).catch(() => null);
  if (!token) return null;
  const ws = await env.DB.prepare('SELECT sheet_id, outbox_folder_id FROM workspaces WHERE id = ?')
    .bind(env.WORKSPACE_ID)
    .first<{ sheet_id: string | null; outbox_folder_id: string | null }>();
  return { token, sheet: ws?.sheet_id ?? null, outbox: ws?.outbox_folder_id ?? null };
}

/** Writes the action's row on the Actions tab: updates its row if the ID is there, else appends. */
async function mirrorToSheet(g: { token: string; sheet: string }, a: ActionBody, file: string, f: typeof fetch) {
  const auth = { authorization: `Bearer ${g.token}`, 'content-type': 'application/json' };
  const got = await f(`${SHEETS}/${g.sheet}/values/${ACTIONS_TAB}!A:A`, { headers: auth });
  if (!got.ok) return false;
  const ids = ((await got.json()) as { values?: string[][] }).values ?? [];
  const row = [
    a.id,
    a.created_at,
    a.screen,
    a.type,
    a.title,
    a.owner,
    a.status,
    '',
    '',
    '',
    a.readout_date ?? '',
    file,
    a.expected_label ?? '',
  ];
  if (!ids.length) {
    await f(`${SHEETS}/${g.sheet}/values/${ACTIONS_TAB}!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ values: [HEADER] }),
    });
  }
  const at = ids.findIndex((r) => r[0] === a.id);
  const res =
    at >= 0
      ? await f(`${SHEETS}/${g.sheet}/values/${ACTIONS_TAB}!A${at + 1}:M${at + 1}?valueInputOption=RAW`, {
          method: 'PUT',
          headers: auth,
          body: JSON.stringify({ values: [row] }),
        })
      : await f(`${SHEETS}/${g.sheet}/values/${ACTIONS_TAB}!A1:append?valueInputOption=RAW`, {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ values: [row] }),
        });
  return res.ok;
}

/** Saves one generated file to the Outbox folder and returns its Drive link. */
async function saveToOutbox(g: { token: string; outbox: string }, o: Output, f: typeof fetch) {
  const boundary = `drishti${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name: o.filename ?? 'drishti.txt', parents: [g.outbox] });
  const body =
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\ncontent-type: ${o.mime ?? 'text/plain'}\r\n\r\n${o.content ?? ''}\r\n--${boundary}--`;
  const res = await f(`${UPLOAD}&fields=id,webViewLink`, {
    method: 'POST',
    headers: { authorization: `Bearer ${g.token}`, 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) return null;
  return ((await res.json()) as { webViewLink?: string }).webViewLink ?? null;
}

export function actionRoutes(app: Hono<AppEnv>, fetcher: () => typeof fetch = () => fetch) {
  app.get('/api/actions', requireRole('view'), async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT params_json FROM actions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 200',
    )
      .bind(c.env.WORKSPACE_ID)
      .all<{ params_json: string }>();
    return c.json({ items: rows.results.map((r) => JSON.parse(r.params_json) as ActionBody) });
  });

  /** Saves the action as the browser has it now; mirrors it to the Sheet and saves new files to the Outbox. */
  app.put('/api/actions/:id', requireRole('run_actions'), async (c) => {
    const a = await c.req.json<ActionBody>().catch(() => null);
    if (!a || a.id !== c.req.param('id') || !a.type || !a.title || !a.status)
      return apiError(c, 400, 'VALIDATION_FAILED', { fields: 'action' });
    await ensureWorkspace(c.env);
    const user = c.get('user');
    const f = fetcher();
    const prev = await c.env.DB.prepare('SELECT status FROM actions WHERE id = ? AND workspace_id = ?')
      .bind(a.id, c.env.WORKSPACE_ID)
      .first<{ status: string }>();

    // Files are saved to the Outbox once, when the action produces them.
    const g = DONE.has(a.status) ? await google(c.env, f) : null;
    const added: Output[] = [];
    if (g?.outbox)
      for (const o of a.outputs ?? [])
        if (o.kind === 'download' && !o.saved) {
          const url = await saveToOutbox({ token: g.token, outbox: g.outbox }, o, f);
          o.saved = true;
          if (url) added.push({ kind: 'link', label: `Open ${o.filename ?? o.label} in Drive`, url, saved: true });
        }
    if (added.length) a.outputs = [...(a.outputs ?? []), ...added];

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO actions (id, workspace_id, suggestion_id, type, executor, screen, title, params_json, created_by, status, expected_label, readout_date, outputs_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, params_json = excluded.params_json, readout_date = excluded.readout_date, outputs_json = excluded.outputs_json, updated_at = excluded.updated_at`,
    )
      .bind(
        a.id,
        c.env.WORKSPACE_ID,
        a.suggestion_id ?? null,
        a.type,
        ['inline', 'job', 'handoff'].includes(a.executor) ? a.executor : 'inline',
        a.screen,
        a.title,
        JSON.stringify(a),
        user.email,
        a.status,
        a.expected_label ?? null,
        a.readout_date ?? null,
        JSON.stringify(a.outputs ?? []),
        a.created_at,
        now,
      )
      .run();

    // The Sheet row changes only when the status does (a running action ticks steps every second).
    let mirrored = false;
    if (prev?.status !== a.status) {
      const gs = g ?? (await google(c.env, f));
      if (gs?.sheet) {
        const file = added[0]?.url ?? '';
        mirrored = await mirrorToSheet({ token: gs.token, sheet: gs.sheet }, a, file, f).catch(() => false);
      }
      await audit(c.env, user.email, 'action', a.type, { id: a.id, status: a.status });
      if (c.env.SLACK_WEBHOOK_URL && (!prev || DONE.has(a.status)))
        await f(c.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: `Drishti · ${a.title} — ${a.status.replace(/_/g, ' ')} (${user.email})` }),
        }).catch(() => undefined);
    }
    return c.json({ ok: true, outputs: added.length ? a.outputs : undefined, mirrored });
  });
}
