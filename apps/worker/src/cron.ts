import type { Env } from './env';
import { readWatchlist, saveCapture, type CaptureFields } from './routes/capture';

const DAY_MS = 86_400_000;
export const MAX_SITES_PER_RUN = 15;

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

/** Approval requests not answered in 72 hours expire (docs/10 §5). */
export async function expireApprovals(env: Env, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - 3 * DAY_MS).toISOString();
  const res = await env.DB.prepare(
    "UPDATE actions SET status = 'expired', params_json = json_set(params_json, '$.status', 'expired'), updated_at = ? WHERE workspace_id = ? AND status = 'awaiting_approval' AND created_at < ?",
  )
    .bind(now.toISOString(), env.WORKSPACE_ID, cutoff)
    .run();
  return res.meta.changes ?? 0;
}

/** Monday 09:00 IST: the week's verdict and open actions, posted to Slack once (docs/10 §6). */
export async function mondaySummary(env: Env, now: Date, fetcher: typeof fetch = fetch): Promise<boolean> {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  if (!env.SLACK_WEBHOOK_URL || ist.getUTCDay() !== 1 || ist.getUTCHours() !== 9) return false;
  const flag = `monday:${ist.toISOString().slice(0, 10)}`;
  if (await env.KV.get(flag)) return false;
  const snap = JSON.parse((await env.KV.get(`snapshot:${env.WORKSPACE_ID}`)) ?? 'null') as {
    week?: { verdict?: { text?: string } };
  } | null;
  const open = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM actions WHERE workspace_id = ? AND status IN ('awaiting_approval', 'running', 'waiting_on_user', 'measuring')",
  )
    .bind(env.WORKSPACE_ID)
    .first<{ n: number }>();
  const text = [
    '*Drishti · Monday summary*',
    snap?.week?.verdict?.text ?? 'No sync yet this week. Press Sync now in Drishti.',
    `Open actions: ${open?.n ?? 0}`,
  ].join('\n');
  const res = await fetcher(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  await env.KV.put(flag, '1', { expirationTtl: 8 * 86_400 });
  return res.ok;
}

/** Marketplaces and quick commerce are never visited automatically (house rule; docs/11 §7). */
export const NO_AUTOMATED_VISITS =
  /(^|\.)(amazon|flipkart|nykaa|blinkit|zepto|swiggy|bigbasket|jiomart|myntra|meesho)\.(in|com)$/i;

/** robots.txt: may "DrishtiBot" (or *) fetch this path? The longest matching Allow or Disallow wins. */
export function robotsAllows(robots: string, path: string, agent = 'drishtibot'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; prefix: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(raw.replace(/#.*/, '').trim());
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (cur && (key === 'allow' || key === 'disallow')) {
      lastWasAgent = false;
      if (value) cur.rules.push({ allow: key === 'allow', prefix: value.replace(/\*$/, '') });
    }
  }
  const group = groups.find((g) => g.agents.includes(agent)) ?? groups.find((g) => g.agents.includes('*'));
  const hit = group?.rules
    .filter((r) => path.startsWith(r.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return hit ? hit.allow : true;
}

/** Price, rating and stock from a product page's JSON-LD. */
export function productFromHtml(html: string): CaptureFields | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]!.trim());
    } catch {
      continue;
    }
    const nodes = (Array.isArray(data) ? data : [data]).flatMap((d) =>
      d && typeof d === 'object' && '@graph' in d ? ((d as { '@graph': unknown[] })['@graph'] ?? []) : [d],
    ) as Record<string, unknown>[];
    const p = nodes.find((n) => String(n?.['@type'] ?? '').includes('Product'));
    if (!p) continue;
    const offer = (Array.isArray(p.offers) ? p.offers[0] : p.offers) as Record<string, unknown> | undefined;
    const rating = p.aggregateRating as Record<string, unknown> | undefined;
    const price = Number(offer?.price ?? offer?.lowPrice);
    return {
      title: typeof p.name === 'string' ? p.name : undefined,
      price_inr: Number.isFinite(price) && price > 0 ? price : undefined,
      rating: rating?.ratingValue ? Number(rating.ratingValue) : undefined,
      review_count: rating?.reviewCount ? Number(rating.reviewCount) : undefined,
      in_stock: offer?.availability ? /InStock/i.test(String(offer.availability)) : undefined,
    };
  }
  return null;
}

/** Daily: rival brand sites on the Watchlist (capture_method "site"), only where robots.txt allows (SITE-01). */
export async function watchRivalSites(env: Env, fetcher: typeof fetch = fetch): Promise<number> {
  let saved = 0;
  const robotsCache = new Map<string, string>();
  // Two fetches per site plus the Sheet calls must stay under 50 subrequests per run (docs/05 §3).
  const sites = (await readWatchlist(env)).filter((w) => w.capture_method === 'site').slice(0, MAX_SITES_PER_RUN);
  for (const item of sites) {
    let u: URL;
    try {
      u = new URL(item.url);
    } catch {
      continue;
    }
    if (NO_AUTOMATED_VISITS.test(u.hostname)) continue;
    if (!robotsCache.has(u.origin))
      robotsCache.set(
        u.origin,
        await fetcher(`${u.origin}/robots.txt`)
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => ''),
      );
    if (!robotsAllows(robotsCache.get(u.origin)!, u.pathname)) continue;
    const html = await fetcher(u.toString(), { headers: { 'user-agent': 'DrishtiBot/1.0 (+price watch)' } })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    const fields = productFromHtml(html);
    if (!fields?.price_inr) continue;
    await saveCapture(env, { userId: 'system', url: item.url, platform: item.platform, item, fields, method: 'site' });
    saved++;
  }
  return saved;
}

export async function scheduled(controller: ScheduledController, env: Env): Promise<void> {
  const now = new Date(controller.scheduledTime);
  if (controller.cron === '*/30 * * * *') {
    const expired = await expireApprovals(env, now);
    const monday = await mondaySummary(env, now).catch(() => false);
    console.log(JSON.stringify({ msg: 'cron', cron: controller.cron, expired, monday }));
    return;
  }
  const deleted = await housekeeping(env, now);
  const sites = await watchRivalSites(env).catch(() => 0);
  console.log(JSON.stringify({ msg: 'cron', cron: controller.cron, did: 'housekeeping', deleted, sites }));
}
