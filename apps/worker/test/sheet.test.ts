import { describe, expect, it } from 'vitest';
import { app } from '../src/index';
import { exportUrlFor, fetchSheet, SHEET_MAX_BYTES } from '../src/routes/sheet';

// API-SHEET (docs/12 §2): GET /api/sheet for the sandbox's linked Google Sheets.

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
const link = `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`;
const PK = new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]);

/** A fake fetch that answers once with the given response, recording the URL asked for. */
function fake(res: Response, finalUrl?: string) {
  const asked: string[] = [];
  const fn = (async (url: string) => {
    asked.push(url);
    if (finalUrl) Object.defineProperty(res, 'url', { value: finalUrl });
    return res;
  }) as unknown as typeof fetch;
  return { fn, asked };
}

const read = async (s: ReadableStream<Uint8Array>) => new Uint8Array(await new Response(s).arrayBuffer());

describe('GET /api/sheet', () => {
  it('turns edit and published links into whole-workbook XLSX exports, and rejects anything else', () => {
    expect(exportUrlFor(link)).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`);
    expect(exportUrlFor(`https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pubhtml`)).toBe(
      `https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pub?output=xlsx`,
    );
    for (const bad of [
      'https://example.com/spreadsheets/d/x',
      `http://docs.google.com/spreadsheets/d/${ID}/edit`,
      `https://docs.google.com.evil.example/spreadsheets/d/${ID}`,
      'https://docs.google.com/document/d/abc',
      'not a url',
    ])
      expect(exportUrlFor(bad)).toBeNull();
  });

  it('rejects a non-Google link with SHEET_LINK_INVALID (400) before any fetch', async () => {
    const res = await app.request('/api/sheet?url=https://example.com/file.csv', {}, {} as never);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('SHEET_LINK_INVALID');
  });

  it('streams the workbook back with its name and no caching', async () => {
    const { fn, asked } = fake(
      new Response(PK, {
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="Lumora data.xlsx"; filename*=UTF-8''Lumora%20data.xlsx`,
        },
      }),
    );
    const r = await fetchSheet(link, fn);
    expect(asked[0]).toContain('/export?format=xlsx');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.name).toBe('Lumora data');
      expect(await read(r.body)).toEqual(PK);
    }
  });

  it('maps a Google sign-in redirect, an HTML page or 401/403 to SHEET_NOT_PUBLIC', async () => {
    const signIn = fake(
      new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } }),
      'https://accounts.google.com/ServiceLogin',
    );
    expect(await fetchSheet(link, signIn.fn)).toMatchObject({ ok: false, status: 403, code: 'SHEET_NOT_PUBLIC' });
    const denied = fake(new Response('no', { status: 401 }));
    expect(await fetchSheet(link, denied.fn)).toMatchObject({ code: 'SHEET_NOT_PUBLIC' });
  });

  it('stops at 20 MB, by length header or while streaming', async () => {
    const big = fake(new Response(PK, { headers: { 'content-length': String(SHEET_MAX_BYTES + 1) } }));
    expect(await fetchSheet(link, big.fn)).toMatchObject({ ok: false, status: 413, code: 'SHEET_TOO_LARGE' });
    const chunk = new Uint8Array(1024 * 1024);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 21; i++) c.enqueue(chunk);
        c.close();
      },
    });
    const r = await fetchSheet(link, fake(new Response(stream)).fn);
    expect(r.ok).toBe(true);
    if (r.ok) await expect(read(r.body)).rejects.toThrow();
  });

  it('reports a network failure as SHEET_FETCH_FAILED', async () => {
    const boom = (async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    expect(await fetchSheet(link, boom)).toMatchObject({ ok: false, status: 502, code: 'SHEET_FETCH_FAILED' });
  });
});
