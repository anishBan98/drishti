import type { Context, Hono, MiddlewareHandler } from 'hono';
import type { AppEnv, Env } from '../env';
import { apiError } from '../lib/errors';
import { serviceAccountToken } from '../lib/google';
import { requireRole } from '../lib/rbac';
import { findSession } from '../lib/session';

// Market capture, compact (docs/07 §7, docs/11 §7): the extension reads the page the person is looking at and posts
// it here with a capture token. Captures are kept in D1 and appended to the Watchlist captures tab, so the next sync
// includes them. Rival brand sites are read by the daily watcher (cron.ts), where robots.txt allows.

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
export const CAPTURE_HEADER = [
  'captured_at',
  'platform',
  'label',
  'brand',
  'product_name',
  'pack_ml',
  'price_inr',
  'mrp_inr',
  'rating',
  'review_count',
  'in_stock',
  'capture_method',
  'url',
];

export interface WatchItem {
  watch_id: string;
  label: string;
  brand: string;
  platform: string;
  url: string;
  url_pattern: string;
  pack_ml: string;
  capture_method: string;
}

export interface CaptureFields {
  title?: string;
  price_inr?: number;
  mrp_inr?: number;
  rating?: number;
  review_count?: number;
  in_stock?: boolean;
  pack_ml?: number;
}

/** Host and path without "www.", query or trailing slash: how a tab is matched to a watched product. */
export const urlPattern = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return '';
  }
};

async function sheetAccess(env: Env) {
  if (!env.GOOGLE_SA_JSON) return null;
  const token = await serviceAccountToken(env.GOOGLE_SA_JSON, { kv: env.KV }).catch(() => null);
  const ws = await env.DB.prepare('SELECT sheet_id FROM workspaces WHERE id = ?')
    .bind(env.WORKSPACE_ID)
    .first<{ sheet_id: string | null }>();
  return token && ws?.sheet_id ? { token, sheet: ws.sheet_id } : null;
}

/** The Watchlist tab as objects. */
export async function readWatchlist(env: Env): Promise<WatchItem[]> {
  const g = await sheetAccess(env);
  if (!g) return [];
  const res = await fetch(`${SHEETS}/${g.sheet}/values/Watchlist`, {
    headers: { authorization: `Bearer ${g.token}` },
  });
  if (!res.ok) return [];
  const [head = [], ...rows] = ((await res.json()) as { values?: string[][] }).values ?? [];
  const col = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name);
  return rows
    .filter((r) => r[col('url')])
    .map((r) => ({
      watch_id: r[col('watch_id')] ?? '',
      label: r[col('label')] ?? '',
      brand: r[col('brand')] ?? '',
      platform: r[col('platform')] ?? '',
      url: r[col('url')] ?? '',
      url_pattern: urlPattern(r[col('url')] ?? ''),
      pack_ml: r[col('pack_ml')] ?? '',
      capture_method: (r[col('capture_method')] ?? 'extension').toLowerCase(),
    }));
}

/** Stores a capture and appends it to the Watchlist captures tab. */
export async function saveCapture(
  env: Env,
  c: { userId: string; url: string; platform: string; item?: WatchItem; fields: CaptureFields; method: string },
) {
  const at = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO captures (id, workspace_id, user_id, url, platform, watch_id, payload_json, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, env.WORKSPACE_ID, c.userId, c.url, c.platform, c.item?.watch_id ?? null, JSON.stringify(c.fields), at)
    .run();
  const g = await sheetAccess(env);
  if (g) {
    const f = c.fields;
    const row = [
      at,
      c.platform,
      c.item?.label ?? f.title ?? '',
      c.item?.brand ?? '',
      f.title ?? '',
      String(f.pack_ml ?? c.item?.pack_ml ?? ''),
      f.price_inr ?? '',
      f.mrp_inr ?? '',
      f.rating ?? '',
      f.review_count ?? '',
      f.in_stock === undefined ? '' : f.in_stock ? 'yes' : 'no',
      c.method,
      c.url,
    ];
    await fetch(`${SHEETS}/${g.sheet}/values/watchlist_captures!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: { authorization: `Bearer ${g.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }).catch(() => undefined);
  }
  return id;
}

/** Capture-token auth for the extension (Authorization: Bearer). */
const requireCapture: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = /^Bearer\s+(\S+)$/.exec(c.req.header('authorization') ?? '')?.[1];
  const user = token ? await findSession(c.env.DB, token, 'capture') : null;
  if (!user) return apiError(c, 401, 'AUTH_SESSION_EXPIRED');
  c.set('user', user);
  await next();
};

const cors = (c: Context<AppEnv>) => {
  const origin = c.req.header('origin') ?? '';
  if (origin.startsWith('chrome-extension://')) {
    c.header('access-control-allow-origin', origin);
    c.header('access-control-allow-headers', 'authorization, content-type');
    c.header('access-control-allow-methods', 'GET, POST, OPTIONS');
  }
};

const inRange = (v: unknown, lo: number, hi: number) =>
  v === undefined || (typeof v === 'number' && v >= lo && v <= hi);

export function captureRoutes(app: Hono<AppEnv>) {
  app.use('/api/watchlist', async (c, next) => {
    cors(c);
    await next();
  });
  app.use('/api/capture', async (c, next) => {
    cors(c);
    await next();
  });
  app.options('/api/watchlist', (c) => c.body(null, 204));
  app.options('/api/capture', (c) => c.body(null, 204));

  app.get('/api/watchlist', requireCapture, async (c) => c.json({ items: await readWatchlist(c.env) }));

  app.post('/api/capture', requireCapture, async (c) => {
    const body = await c.req
      .json<{ url?: string; platform?: string; fields?: CaptureFields; unlisted?: boolean }>()
      .catch(() => null);
    const f = body?.fields;
    if (
      !body?.url ||
      !f ||
      !inRange(f.price_inr, 10, 100_000) ||
      !inRange(f.mrp_inr, 10, 100_000) ||
      !inRange(f.rating, 1, 5)
    )
      return apiError(c, 400, 'VALIDATION_FAILED', { fields: 'url, price_inr, rating' });
    // At most one capture a minute per person (docs/07 §7 RATE_LIMITED).
    const key = `capture:rate:${c.get('user').id}`;
    if (await c.env.KV.get(key)) return apiError(c, 429, 'RATE_LIMITED', { seconds: 60 });
    const item = (await readWatchlist(c.env)).find((w) => w.url_pattern === urlPattern(body.url!));
    if (!item && !body.unlisted) return apiError(c, 422, 'CAPTURE_NOT_ON_WATCHLIST');
    await c.env.KV.put(key, '1', { expirationTtl: 60 });
    const id = await saveCapture(c.env, {
      userId: c.get('user').id,
      url: body.url,
      platform: item?.platform ?? body.platform ?? new URL(body.url).hostname,
      item,
      fields: f,
      method: 'extension',
    });
    return c.json({ id, merged: true }, 201);
  });

  app.get('/api/captures', requireRole('view'), async (c) => {
    const since = c.req.query('since') ?? '1970-01-01';
    const rows = await c.env.DB.prepare(
      'SELECT url, platform, watch_id, payload_json, captured_at FROM captures WHERE workspace_id = ? AND captured_at > ? ORDER BY captured_at DESC LIMIT 200',
    )
      .bind(c.env.WORKSPACE_ID, since)
      .all<{ payload_json: string }>();
    return c.json({
      items: rows.results.map(({ payload_json, ...r }) => ({
        ...r,
        fields: JSON.parse(payload_json) as CaptureFields,
      })),
    });
  });
}
