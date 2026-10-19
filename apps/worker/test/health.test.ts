import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const get = (path: string) => exports.default.fetch(new Request(`https://drishti.test${path}`));

describe('public routes', () => {
  it('GET /api/health returns ok, version and time (docs/07 §2)', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json<{ ok: boolean; version: string; time: string }>();
    expect(body.ok).toBe(true);
    expect(body.version).toBe(env.VERSION);
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it.each(['/api/nope', '/internal/nope'])('%s returns the 404 error envelope from the copy deck', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(404);
    const body = await res.json<{ error: { code: string; message: string; request_id: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe("We couldn't find that.");
    expect(body.error.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
