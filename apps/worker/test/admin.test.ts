import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { app } from '../src/index';
import { idFromUrl } from '../src/routes/admin';

// Admin workspace links with live access checks, and users from the Users tab (docs/04 §4, docs/07 §6).

const SHEET = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
const INBOX = '1InboxFolderIdXXXXXXXXXXX';
const OUTBOX = '1OutboxFolderIdXXXXXXXXXX';
const VIEWER_ONLY = '1ViewerOnlyFolderXXXXXXXX';

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
afterEach(() => vi.restoreAllMocks());

/** Fakes Google: token endpoint, the Sheet, three folders (one shared as Viewer only) and the Users tab. */
function fakeGoogle() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'sa-token' });
    if (url.includes(`/spreadsheets/${SHEET}/values/Users`))
      return Response.json({
        values: [
          ['email', 'role', 'name'],
          ['owner@lumora.example', 'Owner', 'Aditi'],
          ['priya@lumora.example', 'Editor', 'Priya'],
          ['rahul@lumora.example', 'Viewer', 'Rahul'],
        ],
      });
    if (url.includes(`/spreadsheets/${SHEET}`)) return Response.json({ properties: { title: 'Drishti Workspace' } });
    for (const id of [INBOX, OUTBOX])
      if (url.includes(`/files/${id}`))
        return Response.json({
          name: id,
          mimeType: 'application/vnd.google-apps.folder',
          capabilities: { canAddChildren: true },
        });
    if (url.includes(`/files/${VIEWER_ONLY}`))
      return Response.json({
        name: 'Drishti Outbox',
        mimeType: 'application/vnd.google-apps.folder',
        capabilities: { canAddChildren: false },
      });
    return new Response('{}', { status: 404 });
  }) as never);
}

async function ownerSession(e: Record<string, unknown>) {
  const res = await app.request(
    'https://drishti.test/api/test/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e2e-secret': env.E2E_SECRET! },
      body: JSON.stringify({ email: 'owner@lumora.example' }),
    },
    e,
  );
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie, csrf: (await res.json<{ csrf: string }>()).csrf };
}

const put = async (e: Record<string, unknown>, body: unknown) => {
  const s = await ownerSession(e);
  return app.request(
    'https://drishti.test/api/admin/workspace',
    {
      method: 'PUT',
      headers: { cookie: s.cookie, 'x-csrf-token': s.csrf, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    e,
  );
};

describe('admin workspace links', () => {
  it('reads IDs out of Sheet and Drive folder links', () => {
    expect(idFromUrl(`https://docs.google.com/spreadsheets/d/${SHEET}/edit#gid=0`, 'sheet')).toBe(SHEET);
    expect(idFromUrl(`https://drive.google.com/drive/folders/${INBOX}?usp=sharing`, 'folder')).toBe(INBOX);
    expect(idFromUrl(`https://drive.google.com/drive/u/0/folders/${INBOX}`, 'folder')).toBe(INBOX);
    expect(idFromUrl('https://example.com/x', 'sheet')).toBeNull();
  });

  it('saves the links when the service account can open all of them', async () => {
    fakeGoogle();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const res = await put(e, {
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET}/edit`,
      inbox_url: `https://drive.google.com/drive/folders/${INBOX}`,
      outbox_url: `https://drive.google.com/drive/folders/${OUTBOX}`,
    });
    expect(res.status).toBe(200);
    expect((await res.json<{ ok: boolean }>()).ok).toBe(true);
    const row = await env.DB.prepare('SELECT sheet_id, inbox_folder_id FROM workspaces WHERE id = ?')
      .bind('default')
      .first();
    expect(row).toMatchObject({ sheet_id: SHEET, inbox_folder_id: INBOX });
  });

  it('names the exact fix for a folder shared as Viewer only', async () => {
    fakeGoogle();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const res = await put(e, {
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET}/edit`,
      inbox_url: `https://drive.google.com/drive/folders/${INBOX}`,
      outbox_url: `https://drive.google.com/drive/folders/${VIEWER_ONLY}`,
    });
    expect(res.status).toBe(422);
    const body = await res.json<{ checks: Record<string, { ok: boolean; message?: string }> }>();
    expect(body.checks.sheet!.ok).toBe(true);
    expect(body.checks.outbox!.message).toContain('Share it with drishti-sync@test.iam.gserviceaccount.com as Editor.');
  });

  it('asks for the links it could not read', async () => {
    const res = await put({ ...env, GOOGLE_SA_JSON: saJson }, { sheet_url: 'nope' });
    expect(res.status).toBe(400);
    expect((await res.json<{ error: { message: string } }>()).error.message).toContain('sheet_url');
  });

  it('reloads users from the Users tab and keeps the owner', async () => {
    fakeGoogle();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)')
      .bind('default', 'Lumora', new Date().toISOString())
      .run();
    await env.DB.prepare('UPDATE workspaces SET sheet_id = ? WHERE id = ?').bind(SHEET, 'default').run();
    const s = await ownerSession(e);
    const res = await app.request(
      'https://drishti.test/api/admin/users/reload',
      { method: 'POST', headers: { cookie: s.cookie, 'x-csrf-token': s.csrf } },
      e,
    );
    expect(res.status).toBe(200);
    const users = await env.DB.prepare('SELECT email, role FROM users WHERE workspace_id = ? AND active = 1')
      .bind('default')
      .all<{ email: string; role: string }>();
    expect(users.results).toEqual(
      expect.arrayContaining([
        { email: 'owner@lumora.example', role: 'Owner' },
        { email: 'priya@lumora.example', role: 'Editor' },
        { email: 'rahul@lumora.example', role: 'Viewer' },
      ]),
    );
  });
});
