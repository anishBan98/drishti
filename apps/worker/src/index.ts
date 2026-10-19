import { Hono } from 'hono';
import { scheduled } from './cron';
import type { AppEnv, Env } from './env';
import { apiError } from './lib/errors';

// Worker entry (docs/05 §2). Static assets are served by Cloudflare directly; only /api/* and
// /internal/* run this code first (wrangler.toml run_worker_first).
export const app = new Hono<AppEnv>();

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});

// Public health check (docs/07 §2).
app.get('/api/health', (c) => c.json({ ok: true, version: c.env.VERSION, time: new Date().toISOString() }));

app.notFound((c) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/') || path.startsWith('/internal/')) return apiError(c, 404, 'NOT_FOUND');
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err, c) => {
  console.log(JSON.stringify({ msg: 'unhandled', request_id: c.get('requestId'), error: err.message }));
  return apiError(c, 500, 'INTERNAL');
});

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Env>;
