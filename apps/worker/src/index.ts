import { Hono } from 'hono';

// Worker entry: static assets, /api/*, /internal/*, cron (docs/05 §2). Built out from milestone M1.
const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, version: 'dev', time: new Date().toISOString() }));

export default app;
