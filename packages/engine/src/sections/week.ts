import {
  MEDIA,
  MEDIA_CHANNEL,
  MEDIA_LABEL,
  CHANNEL_SHORT,
  formatPct,
  formatRoas,
  formatShortDate,
  joinList,
  round,
  t,
  type Channel,
  type Media,
  type Snapshot,
  type Suggestion,
} from '@drishti/shared';
import { cacNewBuyers, trueRoas, type Context } from '../context';
import { salesTotals } from '../kpi';
import { suggest, topByPriority } from '../suggest';
import { quantile } from '../models/random';
import { addDays, daysBetween, inRange, type Range } from '../windows';
import { weeklySeries } from './performance';
import type { PriceChange } from './market';
import { heroSku } from './market';
import { count, delta, kpi, money } from './common';

// This week (docs/08-METHODS.md §4), v1 bridge: rival price cut (difference-in-differences on the hero SKU),
// quick-commerce stockouts, ad spend changes × real return, running holdout tests, and what is left unexplained.
// Rating and seasonality drivers and the full baseline forecast arrive in milestone M6.

interface Driver {
  id: string;
  label: string;
  channel: string;
  value: number;
  method: string;
  evidence: { label: string; detail?: string }[];
  fixable: boolean;
}

const CHANNEL_OF_PLATFORM: Record<string, Channel> = { Amazon: 'amazon', Flipkart: 'flipkart', Nykaa: 'nykaa' };

function skuUnits(ctx: Context, channel: Channel | 'other', sku: string, r: Range) {
  let units = 0;
  let revenue = 0;
  for (const x of ctx.facts.sales_sku_daily) {
    if (x.sku !== sku || !inRange(x.date, r)) continue;
    if (channel === 'other' ? x.channel === 'own_site' || x.channel === 'nykaa' : x.channel === channel) {
      units += x.units;
      revenue += x.net_revenue_inr;
    }
  }
  return { units, price: units ? revenue / units : 0 };
}

function rivalDriver(ctx: Context, changes: PriceChange[]): Driver | undefined {
  const cut = changes
    .filter((c) => c.pct <= -0.05 && daysBetween(c.date, ctx.w.week[1]) <= 21 && CHANNEL_OF_PLATFORM[c.platform])
    .sort((a, b) => a.pct - b.pct)[0];
  if (!cut) return undefined;
  const channel = CHANNEL_OF_PLATFORM[cut.platform]!;
  const sku = heroSku(ctx);
  const base: Range = [addDays(cut.date, -28), addDays(cut.date, -1)];
  const perWeek = (u: number, r: Range) => (u / (daysBetween(r[0], r[1]) + 1)) * 7;
  const onBase = skuUnits(ctx, channel, sku, base);
  const onNow = skuUnits(ctx, channel, sku, ctx.w.week);
  const offBase = skuUnits(ctx, 'other', sku, base);
  const offNow = skuUnits(ctx, 'other', sku, ctx.w.week);
  const expected =
    perWeek(onBase.units, base) *
    (offBase.units ? perWeek(offNow.units, ctx.w.week) / perWeek(offBase.units, base) : 1);
  const lost = Math.min(0, onNow.units - expected) * (onNow.price || onBase.price);
  return {
    id: 'rival_price_cut',
    label: t('bridge.rival', { rival: cut.label }),
    channel: CHANNEL_SHORT[channel],
    value: lost,
    method: t('bridge.method.did'),
    evidence: [
      {
        label: t('bridge.ev.rival', {
          rival: cut.label,
          pct: formatPct(-cut.pct),
          platform: cut.platform,
          date: formatShortDate(cut.date),
        }),
      },
    ],
    fixable: true,
  };
}

function stockoutDriver(ctx: Context): { driver?: Driver; city?: string; stores: number } {
  const qc = ctx.facts.qc_store_daily;
  const baseRange: Range = [addDays(ctx.w.week[0], -28), addDays(ctx.w.week[0], -1)];
  const base = new Map<string, { units: number; days: number; gmv: number }>();
  for (const r of qc) {
    if (!inRange(r.date, baseRange) || r.stockout) continue;
    const k = `${r.store_id}|${r.sku}`;
    const e = base.get(k) ?? { units: 0, days: 0, gmv: 0 };
    e.units += r.units;
    e.days++;
    e.gmv += r.gmv_inr;
    base.set(k, e);
  }
  const lostBy = new Map<string, number>();
  const sampleBy = new Map<string, number>();
  const stores = new Set<string>();
  for (const r of qc) {
    if (!inRange(r.date, ctx.w.week)) continue;
    sampleBy.set(r.city, (sampleBy.get(r.city) ?? 0) + r.gmv_inr);
    if (!r.stockout) continue;
    const b = base.get(`${r.store_id}|${r.sku}`);
    if (!b?.days) continue;
    lostBy.set(r.city, (lostBy.get(r.city) ?? 0) + (b.gmv / b.days) * 1);
    stores.add(r.store_id);
  }
  const [city, lostSample] = [...lostBy].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!city || !lostSample) return { stores: 0 };
  // Scale the sample stores' lost share to the city's quick-commerce revenue this week.
  const share = lostSample / ((sampleBy.get(city) ?? 0) + lostSample);
  const cityQc = salesTotals(
    ctx.facts.sales_city_daily,
    ctx.w.week,
    (r) => r.city === city && r.channel === 'quick_commerce',
  ).net_revenue_inr;
  const lost = -(cityQc * share) / (1 - share);
  return {
    city,
    stores: stores.size,
    driver: {
      id: 'stockouts',
      label: t('bridge.stockouts', { city }),
      channel: CHANNEL_SHORT.quick_commerce,
      value: lost,
      method: t('bridge.method.stockout'),
      evidence: [{ label: t('bridge.ev.stockout', { n: stores.size, city }) }],
      fixable: true,
    },
  };
}

function holdoutDrivers(ctx: Context): Driver[] {
  const out: Driver[] = [];
  for (const test of ctx.ws.tests) {
    if (test.status !== 'running' || test.design !== 'geo_holdout' || test.start_date > ctx.w.week[1]) continue;
    const m = test.media as Media;
    if (!MEDIA.includes(m)) continue;
    const pre: Range = [addDays(test.start_date, -56), addDays(test.start_date, -1)];
    const inT = (city: string) => test.test_regions.includes(city);
    let preT = 0;
    let preAll = 0;
    let nowT = 0;
    let nowAll = 0;
    for (const r of ctx.facts.spend_city_daily) {
      if (r.media !== m) continue;
      if (inRange(r.date, pre)) {
        preAll += r.spend_inr;
        if (inT(r.city)) preT += r.spend_inr;
      } else if (inRange(r.date, ctx.w.week)) {
        nowAll += r.spend_inr;
        if (inT(r.city)) nowT += r.spend_inr;
      }
    }
    const removed = Math.max(0, (preAll ? (preT / preAll) * nowAll : 0) - nowT);
    if (!removed || !ctx.measured) continue;
    out.push({
      id: `test_${test.test_id}`,
      label: t('bridge.holdout', { medium: MEDIA_LABEL[m] }),
      channel: CHANNEL_SHORT[MEDIA_CHANNEL[m]],
      value: -removed * ctx.real[m].roas,
      method: t('bridge.method.holdout'),
      evidence: [
        {
          label: t('bridge.ev.holdout', {
            cities: joinList(test.test_regions),
            from: formatShortDate(test.start_date),
          }),
        },
      ],
      fixable: false,
    });
  }
  return out;
}

function mediaDrivers(ctx: Context, exclude: Set<Media>): Driver[] {
  const out: Driver[] = [];
  for (const m of MEDIA) {
    const d = ctx.media.week[m].spend_inr - ctx.media.prior_week[m].spend_inr;
    // Creator cost is booked on post days, so week-on-week changes are lumpy; creator lift is read regionally (M6).
    if (m === 'creators' || (exclude.has(m) && d < 0)) continue;
    const value = d * ctx.real[m].roas;
    if (Math.abs(value) < 50_000) continue;
    out.push({
      id: `media_${m}`,
      label: t(d > 0 ? 'bridge.media_up' : 'bridge.media_down', { medium: MEDIA_LABEL[m] }),
      channel: CHANNEL_SHORT[MEDIA_CHANNEL[m]],
      value,
      method: t('bridge.method.media', { roas: formatRoas(ctx.real[m].roas) }),
      evidence: [{ label: t('bridge.ev.media', { change: money(d), medium: MEDIA_LABEL[m] }) }],
      fixable: d < 0,
    });
  }
  return out;
}

export function buildWeek(
  ctx: Context,
  input: { changes: PriceChange[]; candidates: Suggestion[]; sources: Snapshot['sources']; pumpShare?: number },
): Snapshot['week'] {
  const { w, sales, ws } = ctx;
  const threshold = ws.settings.approval_threshold_inr;
  const prior = sales.prior_week.net_revenue_inr;
  const current = sales.week.net_revenue_inr;
  const change = current - prior;

  const rival = rivalDriver(ctx, input.changes);
  const stock = stockoutDriver(ctx);
  const holdouts = holdoutDrivers(ctx);
  const testMedia = new Set(ws.tests.filter((x) => x.status === 'running').map((x) => x.media as Media));
  const drivers: Driver[] = [rival, stock.driver, ...holdouts, ...mediaDrivers(ctx, testMedia)].filter(
    (d): d is Driver => !!d,
  );

  // Reconcile (§4 step 3): if the drivers overshoot the change by more than 20%, scale them to it, keeping signs.
  const sum = drivers.reduce((a, d) => a + d.value, 0);
  const abs = drivers.reduce((a, d) => a + Math.abs(d.value), 0);
  if (abs > Math.abs(change) * 1.2 && sum !== 0 && Math.sign(sum) === Math.sign(change)) {
    const s = Math.min(1, change / sum);
    for (const d of drivers) d.value *= s;
  }
  const explainedSum = drivers.reduce((a, d) => a + d.value, 0);
  const unexplained = change - explainedSum;
  const explained = change ? Math.max(0, 1 - Math.abs(unexplained) / Math.abs(change)) : 1;
  const shown = [...drivers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 6);
  if (Math.abs(unexplained) >= 100_000)
    shown.push({
      id: 'unexplained',
      label: t('bridge.unexplained'),
      channel: t('bridge.all_channels'),
      value: unexplained,
      method: t('bridge.method.rest'),
      evidence: [],
      fixable: false,
    });

  // Axis: the running total's range, padded and rounded to ₹5 L.
  let run = prior;
  const points = [prior, current];
  for (const d of shown) points.push((run += d.value));
  const pad = Math.max(Math.abs(change) * 0.2, 500_000);
  const axis: [number, number] = [
    Math.floor((Math.min(...points) - pad) / 500_000) * 500_000,
    Math.ceil((Math.max(...points) + pad) / 500_000) * 500_000,
  ];

  const fixable = -drivers.filter((d) => d.fixable && d.value < 0).reduce((a, d) => a + d.value, 0);
  const pct = prior ? change / prior : 0;
  const tone = pct < -0.02 ? 'bad' : pct > 0.02 ? 'good' : 'warn';

  // Suggestions that only this screen raises: restock and auto-pause for stockouts; the budget shift (§9.2).
  const own: Suggestion[] = [];
  if (stock.driver && stock.city) {
    own.push(
      suggest(
        {
          type: 'restock_request',
          context: `city=${stock.city}`,
          title: t('week.sg.restock.title', { city: stock.city }),
          why: t('week.sg.restock.why', { n: stock.stores, city: stock.city }),
          expectedInr: stock.driver.value,
          expectedPer: 'week',
          impactLabel: t('impact.per.week', { value: '−' + money(-stock.driver.value) }),
          confidence: 'high',
          params: { city: stock.city },
          stepVars: { city: stock.city },
        },
        threshold,
      ),
      suggest(
        {
          type: 'qc_ads_pause',
          context: `city=${stock.city}`,
          title: t('week.sg.qcpause.title'),
          why: t('week.sg.qcpause.why'),
          impactLabel: t('impact.label.margin', { value: '+' + money(ctx.media.week.qc_ads.spend_inr * 0.05) }),
          expectedInr: ctx.media.week.qc_ads.spend_inr * 0.05,
          expectedPer: 'week',
          confidence: 'medium',
          params: { rule: 'qc_stock_days < 1' },
        },
        threshold,
      ),
    );
  }
  const shift = budgetShift(ctx);
  if (shift)
    own.push(
      suggest(
        {
          type: 'budget_shift',
          context: 'all',
          title: t('week.sg.shift.title', { amount: money(shift.amount) }),
          why: t('week.sg.shift.why', {
            from: shift.from.map((m) => MEDIA_LABEL[m]).join(' and '),
            to: shift.to.map((m) => MEDIA_LABEL[m]).join(' and '),
          }),
          expectedInr: shift.gain,
          expectedPer: 'month',
          confidence: 'low',
          params: { amount_inr: shift.amount, from: shift.from, to: shift.to, moves: shift.moves },
        },
        threshold,
      ),
    );

  const suggestions = topByPriority([...input.candidates, ...own], 5);

  // Working and needs attention: the strongest positive and negative facts of the week.
  const best = [...MEDIA].sort((a, b) => ctx.real[b].roas - ctx.real[a].roas)[0]!;
  const weekly = weeklySeries(ctx, 8);
  const channelGrowth = (Object.keys(weekly.revenue_by_channel) as Channel[])
    .map((c) => {
      const s = weekly.revenue_by_channel[c];
      const now = s.at(-1) ?? 0;
      const before = s.at(-2) ?? 0;
      return { c, g: before ? (now - before) / before : 0 };
    })
    .sort((a, b) => b.g - a.g);
  const working = [
    ...(ctx.measured
      ? [
          {
            title: t('week.working.media', { medium: MEDIA_LABEL[best] }),
            detail: t('week.working.media.detail', { roas: `₹${ctx.real[best].roas.toFixed(2)}` }),
          },
        ]
      : []),
    {
      title: t('week.working.channel', {
        channel: CHANNEL_SHORT[channelGrowth[0]!.c],
        pct: formatPct(channelGrowth[0]!.g, { signed: true }),
      }),
      detail: t('week.working.channel.detail'),
    },
    {
      title: t('week.working.orders', { n: count(sales.week.orders) }),
      detail: t('week.working.orders.detail', { aov: money(sales.week.aov_inr) }),
    },
  ];
  const late = input.sources.filter((s) => s.status === 'late');
  const cac = cacNewBuyers(ctx, w.week);
  const cacPrior = cacNewBuyers(ctx, w.prior_week);
  const attention = [
    rival
      ? { title: t('week.attention.rival'), detail: rival.evidence[0]!.label }
      : {
          title: t('week.attention.channel', { channel: CHANNEL_SHORT[channelGrowth.at(-1)!.c] }),
          detail: t('week.attention.channel.detail', { pct: formatPct(channelGrowth.at(-1)!.g) }),
        },
    input.pumpShare !== undefined && input.pumpShare > 0.05
      ? {
          title: t('week.attention.pump'),
          detail: t('week.attention.pump.detail', { pct: formatPct(input.pumpShare) }),
        }
      : { title: t('week.attention.cac'), detail: t('week.attention.cac.detail', { cac: money(cac) }) },
    late.length
      ? { title: t('week.attention.late', { n: late.length }), detail: late.map((s) => s.label).join(', ') }
      : { title: t('week.attention.cac'), detail: t('week.attention.cac.detail', { cac: money(cac) }) },
  ];

  const negatives = drivers.filter((d) => d.value < 0);
  const external = negatives.filter((d) => d.id === 'rival_price_cut' || d.id === 'stockouts');
  const extShare = negatives.length
    ? external.reduce((a, d) => a + d.value, 0) / negatives.reduce((a, d) => a + d.value, 0)
    : 0;
  const inference =
    change < 0 && extShare >= 0.5
      ? t('week.inference.external', {
          share: formatPct(extShare),
          driver_list: joinList(external.map((d) => d.label)),
        })
      : change < 0
        ? t('week.inference.media')
        : t('week.inference.up');

  const tr = trueRoas(ctx, ctx.media.week);
  const trPrior = trueRoas(ctx, ctx.media.prior_week);
  const spend = MEDIA.reduce((a, m) => a + ctx.media.week[m].spend_inr, 0);
  const spendPrior = MEDIA.reduce((a, m) => a + ctx.media.prior_week[m].spend_inr, 0);
  const claimed = MEDIA.reduce((a, m) => a + ctx.media.week[m].platform_claimed_revenue_inr, 0);
  const revSpark = weekly.weeks.map((_, i) =>
    (Object.values(weekly.revenue_by_channel) as number[][]).reduce((a, s) => a + s[i]!, 0),
  );

  return {
    verdict: {
      tone,
      chip: t(tone === 'bad' ? 'verdict.down_week' : tone === 'good' ? 'verdict.up_week' : 'verdict.flat_week'),
      text:
        tone === 'bad'
          ? t('week.verdict.down', { pct: formatPct(-pct), revenue: money(current), fixable: money(fixable) })
          : tone === 'good'
            ? t('week.verdict.up', { pct: formatPct(pct), revenue: money(current) })
            : t('week.verdict.flat', { revenue: money(current) }),
    },
    kpis: [
      kpi('revenue', 'kpi.net_revenue', current, money(current), {
        delta: delta('revenue', current, prior),
        spark: revSpark,
      }),
      kpi('orders', 'kpi.orders', sales.week.orders, count(sales.week.orders), {
        delta: delta('orders', sales.week.orders, sales.prior_week.orders),
        spark: weekly.orders,
      }),
      kpi('aov', 'kpi.aov', sales.week.aov_inr, money(sales.week.aov_inr), {
        delta: delta('aov', sales.week.aov_inr, sales.prior_week.aov_inr),
        spark: weekly.aov,
      }),
      kpi('ad_spend', 'kpi.ad_spend', spend, money(spend), {
        delta: { ...delta('spend', spend, spendPrior), good: null },
        tone: 'neutral',
      }),
      ctx.measured
        ? kpi('true_roas', 'kpi.true_roas', tr, formatRoas(tr), {
            delta: delta('true_roas', tr, trPrior, 'x'),
            note: t('note.claims', { value: formatRoas(spend ? claimed / spend : 0) }),
          })
        : kpi('true_roas', 'kpi.true_roas', 0, '—', { note: t('note.needs_history'), tone: 'neutral' }),
      kpi('cac', 'kpi.cac', cac, money(cac), { delta: delta('cac', cac, cacPrior) }),
    ],
    bridge: {
      prior,
      current,
      axis,
      explained_pct: round(explained, 3),
      drivers: shown.map((d) => ({
        id: d.id,
        label: d.label,
        channel: d.channel,
        value_lakh: round(d.value / 100_000, 1),
        method: d.method,
        evidence: d.evidence,
      })),
    },
    working,
    attention,
    inference,
    suggestions,
  };
}

/** Greedy budget optimiser (docs/08 §9.2), v1 without saturation: move ₹1 L steps from the lowest to the highest real
 * return, at most ±30% per medium, up to ₹30 L a month. */
export function budgetShift(
  ctx: Context,
): { amount: number; from: Media[]; to: Media[]; gain: number; moves: Record<string, number> } | undefined {
  const monthly = Object.fromEntries(MEDIA.map((m) => [m, (ctx.media.d28[m].spend_inr / 28) * 30])) as Record<
    Media,
    number
  >;
  const start = { ...monthly };
  const step = 100_000;
  let moved = 0;
  let gain = 0;
  // Marginal return at current spend (docs/08 §3.4): β / (1 + x̄/κ)², κ = 80th percentile of daily spend in 365 days.
  const marginal = Object.fromEntries(
    MEDIA.map((m) => {
      const daily = new Map<string, number>();
      for (const r of ctx.facts.spend_city_daily)
        if (r.media === m && inRange(r.date, ctx.w.d365)) daily.set(r.date, (daily.get(r.date) ?? 0) + r.spend_inr);
      const sorted = [...daily.values()].sort((a, b) => a - b);
      const kappa = quantile(sorted, 0.8) || 1;
      const mean = ctx.media.d28[m].spend_inr / 28;
      return [m, ctx.real[m].roas / (1 + mean / kappa) ** 2];
    }),
  ) as Record<Media, number>;
  const order = [...MEDIA].filter((m) => ctx.real[m].identified).sort((a, b) => marginal[a] - marginal[b]);
  if (order.length < 2) return undefined;
  while (moved < 3_000_000) {
    const from = order.find((m) => monthly[m] - step >= start[m] * 0.7);
    const to = [...order].reverse().find((m) => monthly[m] + step <= start[m] * 1.3);
    if (!from || !to || from === to || marginal[to] <= marginal[from] * 1.1) break;
    monthly[from] -= step;
    monthly[to] += step;
    moved += step;
    gain += step * (marginal[to] - marginal[from]);
  }
  if (!moved) return undefined;
  const moves = Object.fromEntries(
    MEDIA.filter((m) => monthly[m] !== start[m]).map((m) => [m, Math.round(monthly[m] - start[m])]),
  );
  return {
    amount: moved,
    from: MEDIA.filter((m) => monthly[m] < start[m]),
    to: MEDIA.filter((m) => monthly[m] > start[m]),
    gain,
    moves,
  };
}
