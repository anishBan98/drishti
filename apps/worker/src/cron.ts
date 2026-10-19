import type { Env } from './env';

const DAY_MS = 86_400_000;

// Retention from docs/06-DATA-MODEL.md §3: expired sessions after 30 days, captures and events after 400 days.
export async function housekeeping(
  env: Env,
  now: Date,
): Promise<{ sessions: number; captures: number; events: number }> {
  const iso = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const [sessions, captures, events] = await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(iso(30)),
    env.DB.prepare('DELETE FROM captures WHERE captured_at < ?').bind(iso(400)),
    env.DB.prepare('DELETE FROM events WHERE at < ?').bind(iso(400)),
  ]);
  return {
    sessions: sessions?.meta.changes ?? 0,
    captures: captures?.meta.changes ?? 0,
    events: events?.meta.changes ?? 0,
  };
}

export async function scheduled(controller: ScheduledController, env: Env): Promise<void> {
  const now = new Date(controller.scheduledTime);
  if (controller.cron === '*/30 * * * *') {
    // Reminders, approval expiry and readout dispatch arrive with milestones M7 to M9.
    console.log(JSON.stringify({ msg: 'cron', cron: controller.cron, did: 'nothing due' }));
    return;
  }
  const deleted = await housekeeping(env, now);
  console.log(JSON.stringify({ msg: 'cron', cron: controller.cron, did: 'housekeeping', deleted }));
}
