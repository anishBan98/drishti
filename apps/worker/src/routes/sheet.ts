import type { Hono } from 'hono';
import type { AppEnv } from '../env';
import { apiError } from '../lib/errors';

// GET /api/sheet?url= (docs/07 §2): fetches a link-shared Google Sheet as XLSX for the sandbox, because browsers
// cannot download it across sites. Only Google Sheets links; nothing is stored, and neither the link nor the
// contents are logged.

export const SHEET_MAX_BYTES = 20 * 1024 * 1024;
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Google Sheets link → the export URL for the whole workbook, or null if it is not a Sheets link. */
export function exportUrlFor(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com') return null;
  // Published to the web: /spreadsheets/d/e/<pub id>/pubhtml
  const pub = /^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]{20,})(\/|$)/.exec(u.pathname);
  if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=xlsx`;
  const id = /^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(\/|$)/.exec(u.pathname);
  return id ? `https://docs.google.com/spreadsheets/d/${id[1]}/export?format=xlsx` : null;
}

export type SheetResult =
  | { ok: true; body: ReadableStream<Uint8Array>; name: string; length?: number }
  | {
      ok: false;
      status: 400 | 403 | 413 | 502;
      code: 'SHEET_LINK_INVALID' | 'SHEET_NOT_PUBLIC' | 'SHEET_TOO_LARGE' | 'SHEET_FETCH_FAILED';
    };

/** Workbook name from Google's Content-Disposition (filename*=UTF-8''…), without the extension. */
function nameFrom(disposition: string | null): string {
  if (!disposition) return '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
  let name = plain ?? '';
  try {
    if (star) name = decodeURIComponent(star);
  } catch {
    /* keep the plain name */
  }
  return name.replace(/\.xlsx$/i, '').slice(0, 120);
}

export async function fetchSheet(raw: string, fetcher: typeof fetch = fetch): Promise<SheetResult> {
  const target = exportUrlFor(raw);
  if (!target) return { ok: false, status: 400, code: 'SHEET_LINK_INVALID' };
  let res: Response;
  try {
    res = await fetcher(target, { redirect: 'follow', headers: { accept: XLSX_TYPE } });
  } catch {
    return { ok: false, status: 502, code: 'SHEET_FETCH_FAILED' };
  }
  const finalHost = (() => {
    try {
      return new URL(res.url || target).hostname;
    } catch {
      return '';
    }
  })();
  const type = res.headers.get('content-type') ?? '';
  // A private sheet ends on Google's sign-in page (HTML) or answers 401/403.
  if (res.status === 401 || res.status === 403 || finalHost === 'accounts.google.com' || /text\/html/i.test(type)) {
    await res.body?.cancel();
    return { ok: false, status: 403, code: 'SHEET_NOT_PUBLIC' };
  }
  if (!res.ok || !res.body) {
    await res.body?.cancel();
    return {
      ok: false,
      status: res.status === 404 ? 403 : 502,
      code: res.status === 404 ? 'SHEET_NOT_PUBLIC' : 'SHEET_FETCH_FAILED',
    };
  }
  const length = Number(res.headers.get('content-length') ?? '') || undefined;
  if (length && length > SHEET_MAX_BYTES) {
    await res.body.cancel();
    return { ok: false, status: 413, code: 'SHEET_TOO_LARGE' };
  }
  // Stop a body without a length at the limit too.
  let seen = 0;
  const limited = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        seen += chunk.byteLength;
        if (seen > SHEET_MAX_BYTES) ctrl.error(new Error('SHEET_TOO_LARGE'));
        else ctrl.enqueue(chunk);
      },
    }),
  );
  return { ok: true, body: limited, name: nameFrom(res.headers.get('content-disposition')), length };
}

// Best-effort rate limit per IP, in memory (no KV writes on the free plan): 30 a minute per isolate.
const hits = new Map<string, { n: number; at: number }>();
function limited(ip: string, now = Date.now()): number {
  const h = hits.get(ip);
  if (!h || now - h.at > 60_000) {
    hits.set(ip, { n: 1, at: now });
    if (hits.size > 5000) hits.clear();
    return 0;
  }
  h.n++;
  return h.n > 30 ? Math.ceil((h.at + 60_000 - now) / 1000) : 0;
}

export function sheetRoutes(app: Hono<AppEnv>, fetcher?: typeof fetch) {
  app.get('/api/sheet', async (c) => {
    const wait = limited(c.req.header('cf-connecting-ip') ?? 'local');
    if (wait) return apiError(c, 429, 'RATE_LIMITED', { seconds: wait });
    const r = await fetchSheet(c.req.query('url') ?? '', fetcher ?? fetch);
    if (!r.ok) return apiError(c, r.status, r.code);
    return new Response(r.body, {
      headers: {
        'content-type': XLSX_TYPE,
        'cache-control': 'no-store',
        'x-sheet-name': encodeURIComponent(r.name),
        ...(r.length ? { 'content-length': String(r.length) } : {}),
      },
    });
  });
}
