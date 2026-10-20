import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expireApprovals,
  mondaySummary,
  NO_AUTOMATED_VISITS,
  productFromHtml,
  robotsAllows,
  watchRivalSites,
} from '../src/cron';
import { app } from '../src/index';
import { ensureWorkspace } from '../src/routes/auth';

// Compact M9: extension captures, rival-site watcher (SITE-01), approval expiry, Monday summary.

const SHEET = '1M9SheetIdXXXXXXXXXXXXXXXXX';
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
  await env.DB.prepare('UPDATE workspaces SET sheet_id = ? WHERE id = ?').bind(SHEET, env.WORKSPACE_ID).run();
});
afterEach(() => vi.restoreAllMocks());

const PAGE = `<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Rival C Vitamin C 30 ml",
"offers":{"@type":"Offer","price":"499","priceCurrency":"INR","availability":"https://schema.org/InStock"},
"aggregateRating":{"ratingValue":"4.1","reviewCount":"812"}}</script></html>`;

function fakeWeb(robots = 'User-agent: *\nDisallow: /checkout\n') {
  const visited: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    visited.push(url);
    if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'sa-token' });
    if (url.includes(`/spreadsheets/${SHEET}/values/Watchlist`))
      return Response.json({
        values: [
          ['watch_id', 'label', 'brand', 'platform', 'url', 'pack_ml', 'is_us', 'capture_method'],
          ['W01', 'Rival C', 'Rival C', 'Brand site', 'https://rivalc.example/products/vit-c', '30', 'no', 'site'],
          ['W02', 'Rival C', 'Rival C', 'Brand site', 'https://rivalc.example/checkout/vit-c', '30', 'no', 'site'],
          ['W03', 'Rival B', 'Rival B', 'Amazon', 'https://www.amazon.in/dp/B0TEST', '30', 'no', 'site'],
          ['W04', 'Rival D', 'Rival D', 'Amazon', 'https://www.amazon.in/dp/B0EXT', '30', 'no', 'extension'],
        ],
      });
    if (url.includes(`/spreadsheets/${SHEET}/values/`)) return Response.json({});
    if (url.endsWith('/robots.txt')) return new Response(robots);
    if (url.startsWith('https://rivalc.example/')) return new Response(PAGE);
    return new Response('{}', { status: 404 });
  }) as never);
  return visited;
}

describe('rival-site watcher', () => {
  it('reads price, rating and stock from JSON-LD', () => {
    expect(productFromHtml(PAGE)).toMatchObject({ price_inr: 499, rating: 4.1, review_count: 812, in_stock: true });
    expect(productFromHtml('<html>no data</html>')).toBeNull();
  });

  it('follows robots.txt, longest rule first', () => {
    const robots = 'User-agent: *\nDisallow: /products\nAllow: /products/public\n';
    expect(robotsAllows(robots, '/products/x')).toBe(false);
    expect(robotsAllows(robots, '/products/public/x')).toBe(true);
    expect(robotsAllows('User-agent: DrishtiBot\nDisallow: /\n', '/a')).toBe(false);
    expect(robotsAllows('', '/a')).toBe(true);
  });

  it('never visits marketplaces or quick commerce automatically', () => {
    for (const h of ['www.amazon.in', 'flipkart.com', 'www.nykaa.com', 'blinkit.com', 'www.zepto.com', 'swiggy.com'])
      expect(NO_AUTOMATED_VISITS.test(h)).toBe(true);
    expect(NO_AUTOMATED_VISITS.test('rivalc.example')).toBe(false);
  });

  it('SITE-01 captures allowed brand-site pages only', async () => {
    const visited = fakeWeb();
    const n = await watchRivalSites({ ...env, GOOGLE_SA_JSON: saJson });
    expect(n).toBe(1);
    expect(visited.some((u) => u.includes('amazon.in'))).toBe(false);
    expect(visited.some((u) => u.includes('/checkout/'))).toBe(false);
    const row = await env.DB.prepare("SELECT payload_json FROM captures WHERE watch_id = 'W01'").first<{
      payload_json: string;
    }>();
    expect(JSON.parse(row!.payload_json)).toMatchObject({ price_inr: 499 });
  });
});

async function captureToken(e: object) {
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
  const csrf = (await res.json<{ csrf: string }>()).csrf;
  const t = await app.request(
    'https://drishti.test/api/extension/token',
    { method: 'POST', headers: { cookie, 'x-csrf-token': csrf } },
    e,
  );
  return (await t.json<{ token: string }>()).token;
}

describe('extension capture', () => {
  it('saves a capture of a watched page and refuses pages not on the watchlist', async () => {
    fakeWeb();
    const e = { ...env, GOOGLE_SA_JSON: saJson };
    const token = await captureToken(e);
    const post = (url: string) =>
      app.request(
        'https://drishti.test/api/capture',
        {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ url, fields: { price_inr: 449, rating: 4.2, review_count: 26112, in_stock: true } }),
        },
        e,
      );
    expect((await post('https://www.amazon.in/dp/B0NOTWATCHED')).status).toBe(422);
    const ok = await post('https://www.amazon.in/dp/B0EXT?ref=abc');
    expect(ok.status).toBe(201);
    expect((await post('https://www.amazon.in/dp/B0EXT')).status).toBe(429);
    const list = await app.request(
      'https://drishti.test/api/watchlist',
      { headers: { authorization: 'Bearer nope' } },
      e,
    );
    expect(list.status).toBe(401);
  });
});

describe('approvals and Monday summary', () => {
  it('expires approval requests older than 72 hours', async () => {
    const old = new Date(Date.now() - 4 * 86_400_000).toISOString();
    await env.DB.prepare(
      "INSERT INTO actions (id, workspace_id, type, executor, screen, title, params_json, created_by, status, created_at, updated_at) VALUES ('ac_old', ?, 'budget_shift', 'job', 'Impact', 'Shift', '{\"status\":\"awaiting_approval\"}', 'x', 'awaiting_approval', ?, ?)",
    )
      .bind(env.WORKSPACE_ID, old, old)
      .run();
    expect(await expireApprovals(env, new Date())).toBeGreaterThanOrEqual(1);
    const row = await env.DB.prepare("SELECT status, params_json FROM actions WHERE id = 'ac_old'").first<{
      status: string;
      params_json: string;
    }>();
    expect(row?.status).toBe('expired');
    expect(JSON.parse(row!.params_json).status).toBe('expired');
  });

  it('posts the Monday summary once, at 09:00 IST on Mondays', async () => {
    const sent: string[] = [];
    const f = (async (_u: string, init?: RequestInit) => {
      sent.push(String(init?.body));
      return new Response('ok');
    }) as unknown as typeof fetch;
    const e = { ...env, SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x' };
    const monday9 = new Date('2026-10-26T03:30:00Z'); // Monday 09:00 IST
    expect(await mondaySummary(e, new Date('2026-10-27T03:30:00Z'), f)).toBe(false);
    expect(await mondaySummary(e, monday9, f)).toBe(true);
    expect(await mondaySummary(e, monday9, f)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('Monday summary');
  });
});
