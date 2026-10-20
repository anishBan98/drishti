import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/index';
import { ensureWorkspace } from '../src/routes/auth';

// Compact sync (docs/05 §6): the Worker lists and passes through the Workspace Sheet and Inbox files; the browser
// saves the snapshot it built; everyone signed in reads it.

const SHEET = '1SyncSheetIdXXXXXXXXXXXXXXXX';
const INBOX = '1SyncInboxIdXXXXXXXXXXXX';
const CSV = '1MetaAdsCsvFileIdXXXXXXX';
const OUTSIDE = '1SomeoneElsesFileXXXXXXX';

let saJson = '';
beforeAll(async () => {
  const k = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array((await crypto.subtle.exportKey('pkcs8', k.privateKey)) as ArrayBuffer);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  saJson = JSON.stringify({ client_email: 'drishti-sync@test.iam.gserviceaccount.com', private_key: pem });
});
beforeEach(async () => {
  await ensureWorkspace(env);
  await env.DB.prepare('UPDATE workspaces SET sheet_id = ?, inbox_folder_id = ? WHERE id = ?')
    .bind(SHEET, INBOX, env.WORKSPACE_ID)
    .run();
});
afterEach(() => vi.restoreAllMocks());

function fakeDrive() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'sa-token' });
    if (url.includes('/drive/v3/files?q='))
      return Response.json({
        files: [
          { id: CSV, name: 'meta_ads_daily.csv', mimeType: 'text/csv', size: '120' },
          { id: '1SubFolderXXXXXXXXXXXXXX', name: 'old', mimeType: 'application/vnd.google-apps.folder' },
        ],
      });
    if (url.includes(`/files/${SHEET}/export`)) return new Response('xlsx-bytes');
    if (url.includes(`/files/${SHEET}?`))
      return Response.json({
        id: SHEET,
        name: 'Drishti Workspace',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      });
    if (url.includes(`/files/${CSV}?alt=media`)) return new Response('date,spend\n2026-10-01,100\n');
    if (url.includes(`/files/${CSV}?`))
      return Response.json({ id: CSV, name: 'meta_ads_daily.csv', mimeType: 'text/csv', parents: [INBOX] });
    if (url.includes(`/files/${OUTSIDE}?`))
      return Response.json({ id: OUTSIDE, name: 'payroll.csv', mimeType: 'text/csv', parents: ['1OtherFolder'] });
    return new Response('{}', { status: 404 });
  }) as never);
}

async function session(e: Record<string, unknown>, email: string) {
  const res = await app.request(
    'https://drishti.test/api/test/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e2e-secret': env.E2E_SECRET! },
      body: JSON.stringify({ email }),
    },
    e,
  );
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie, csrf: (await res.json<{ csrf: string }>()).csrf };
}

describe('sync', () => {
  it('lists the Workspace Sheet and the Inbox files, not sub-folders', async () => {
    fakeDrive();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const s = await session(e, env.OWNER_EMAIL ?? 'owner@lumora.example');
    const res = await app.request('https://drishti.test/api/sync/sources', { headers: { cookie: s.cookie } }, e);
    expect(res.status).toBe(200);
    const { items } = await res.json<{ items: { id: string; kind: string }[] }>();
    expect(items.map((i) => i.id)).toEqual([SHEET, CSV]);
  });

  it('passes through the Sheet as xlsx and an Inbox file as is, and refuses files outside the Inbox', async () => {
    fakeDrive();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const s = await session(e, env.OWNER_EMAIL ?? 'owner@lumora.example');
    const get = (id: string) =>
      app.request(`https://drishti.test/api/sync/file/${id}`, { headers: { cookie: s.cookie } }, e);
    const sheet = await get(SHEET);
    expect(sheet.status).toBe(200);
    expect(decodeURIComponent(sheet.headers.get('x-file-name')!)).toBe('Drishti Workspace.xlsx');
    expect(await sheet.text()).toBe('xlsx-bytes');
    const csv = await get(CSV);
    expect(await csv.text()).toContain('date,spend');
    expect((await get(OUTSIDE)).status).toBe(404);
  });

  it('saves a snapshot for the workspace and every signed-in user reads it; Viewers cannot sync', async () => {
    const owner = await session(env, env.OWNER_EMAIL ?? 'owner@lumora.example');
    const snap = { version: 'v-test-1', generated_at: '2026-10-21T10:00:00Z', data_through: '2026-10-20' };
    const put = await app.request(
      'https://drishti.test/api/snapshot',
      {
        method: 'PUT',
        headers: { cookie: owner.cookie, 'x-csrf-token': owner.csrf, 'x-files-parsed': '2' },
        body: JSON.stringify(snap),
      },
      env,
    );
    expect(put.status).toBe(200);
    const run = await env.DB.prepare('SELECT status, files_parsed FROM sync_runs WHERE snapshot_version = ?')
      .bind('v-test-1')
      .first();
    expect(run).toMatchObject({ status: 'ok', files_parsed: 2 });

    await env.DB.prepare(
      "INSERT OR IGNORE INTO users (id, workspace_id, email, name, role, created_at) VALUES ('u-viewer', ?, 'viewer@lumora.example', 'Rahul', 'Viewer', '2026-10-21')",
    )
      .bind(env.WORKSPACE_ID)
      .run();
    const viewer = await session(env, 'viewer@lumora.example');
    const got = await app.request('https://drishti.test/api/snapshot', { headers: { cookie: viewer.cookie } }, env);
    expect(await got.json()).toMatchObject({ version: 'v-test-1' });
    const denied = await app.request(
      'https://drishti.test/api/sync/sources',
      { headers: { cookie: viewer.cookie } },
      env,
    );
    expect(denied.status).toBe(403);
  });

  it('asks to link the workspace first when it is not linked', async () => {
    await env.DB.prepare('UPDATE workspaces SET sheet_id = NULL WHERE id = ?').bind(env.WORKSPACE_ID).run();
    const s = await session(env, env.OWNER_EMAIL ?? 'owner@lumora.example');
    const res = await app.request('https://drishti.test/api/sync/sources', { headers: { cookie: s.cookie } }, env);
    expect(res.status).toBe(409);
    expect((await res.json<{ error: { code: string } }>()).error.code).toBe('WORKSPACE_NOT_CONFIGURED');
  });
});
