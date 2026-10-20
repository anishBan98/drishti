import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/index';
import { ensureWorkspace } from '../src/routes/auth';

// Compact action engine (docs/10): actions saved for the team, mirrored to the Actions tab, files to the Outbox.

const SHEET = '1ActSheetIdXXXXXXXXXXXXXXXX';
const OUTBOX = '1ActOutboxIdXXXXXXXXXXXX';

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
  await env.DB.prepare('UPDATE workspaces SET sheet_id = ?, outbox_folder_id = ? WHERE id = ?')
    .bind(SHEET, OUTBOX, env.WORKSPACE_ID)
    .run();
});
afterEach(() => vi.restoreAllMocks());

/** Fakes Google; records Sheet writes and Drive uploads. */
function fakeGoogle() {
  const calls: { method: string; url: string; body: string }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: typeof init?.body === 'string' ? init.body : '' });
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'sa-token' });
    if (url.includes(`/spreadsheets/${SHEET}/values/Actions!A:A`))
      return Response.json({ values: [['action_id'], ['A-0001']] });
    if (url.includes(`/spreadsheets/${SHEET}/values/`)) return Response.json({});
    if (url.includes('/upload/drive/v3/files'))
      return Response.json({ id: 'f1', webViewLink: 'https://drive.google.com/file/d/f1/view' });
    return new Response('{}', { status: 404 });
  }) as never);
  return calls;
}

async function session(e: object, email: string) {
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

const action = (status: string, extra: Record<string, unknown> = {}) => ({
  id: 'ac_test_1',
  type: 'amazon_coupon',
  title: 'Match Rival B with a 12% Amazon coupon',
  screen: 'Market',
  owner: 'Priya',
  status,
  executor: 'handoff',
  expected_label: '+₹9 L/wk',
  created_at: '2026-10-21T10:00:00Z',
  steps: [],
  outputs: [],
  ...extra,
});

describe('actions', () => {
  it('saves an action, appends it to the Actions tab, then saves its file to the Outbox with a Drive link', async () => {
    const calls = fakeGoogle();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const s = await session(e, 'owner@lumora.example');
    const put = (body: unknown) =>
      app.request(
        'https://drishti.test/api/actions/ac_test_1',
        {
          method: 'PUT',
          headers: { cookie: s.cookie, 'x-csrf-token': s.csrf, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
        e,
      );
    const first = await put(action('running'));
    expect(first.status).toBe(200);
    expect(calls.some((c) => c.method === 'POST' && c.url.includes('Actions!A1:append'))).toBe(true);

    const file = { kind: 'download', label: 'Coupon file', filename: 'coupon.csv', mime: 'text/csv', content: 'a,b\n' };
    const done = await put(action('waiting_on_user', { outputs: [file] }));
    const body = await done.json<{ outputs: { kind: string; url?: string; saved?: boolean }[] }>();
    expect(body.outputs.find((o) => o.kind === 'link')?.url).toBe('https://drive.google.com/file/d/f1/view');
    expect(body.outputs[0]!.saved).toBe(true);
    expect(calls.filter((c) => c.url.includes('/upload/drive/v3/files')).length).toBe(1);
    expect(calls.find((c) => c.url.includes('/upload/drive/'))!.body).toContain(OUTBOX);

    // The team sees it.
    const list = await app.request('https://drishti.test/api/actions', { headers: { cookie: s.cookie } }, e);
    const { items } = await list.json<{ items: { id: string; status: string }[] }>();
    expect(items.find((a) => a.id === 'ac_test_1')?.status).toBe('waiting_on_user');
  });

  it('refuses Viewers', async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO users (id, workspace_id, email, name, role, created_at) VALUES ('u-v2', ?, 'v2@lumora.example', 'V', 'Viewer', '2026-10-21')",
    )
      .bind(env.WORKSPACE_ID)
      .run();
    const s = await session({ ...env }, 'v2@lumora.example');
    const res = await app.request(
      'https://drishti.test/api/actions/ac_x',
      {
        method: 'PUT',
        headers: { cookie: s.cookie, 'x-csrf-token': s.csrf, 'content-type': 'application/json' },
        body: JSON.stringify(action('running', { id: 'ac_x' })),
      },
      { ...env },
    );
    expect(res.status).toBe(403);
  });
});
