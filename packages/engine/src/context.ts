import { MEDIA, type Media } from '@drishti/shared';
import type { Facts, OwnSiteCustomer } from './facts/types';
import type { Workspace } from './facts/workspace';
import { dataThrough, mediaTotals, salesTotals, type MediaTotals, type SalesTotals } from './kpi';
import { fitMmm, type MmmResult } from './models/mmm';
import { inRange, windowsFor, addDays, daysBetween, type Windows } from './windows';

// Everything the sections share, computed once per snapshot.

/** Share of each acquisition medium's real lift that lands on the own site (docs/08 §2 CAC defaults). */
export const OWN_SITE_SHARE: Partial<Record<Media, number>> = { meta: 0.5, google: 0.6, creators: 0.3 };
/** Minimum history for the media-mix regression (docs/08 §3.4). */
export const MIN_HISTORY_DAYS = 120;
/** The demo own-site files are a 5% sample of buyers (docs/11 §9): scale counts by 20 for totals. */
export const DEMO_SAMPLE_SCALE = 20;

export interface RealReturn {
  roas: number;
  low: number;
  high: number;
  confidence: 'high' | 'medium' | 'low';
  /** false when the regression could not separate this medium (its 90% range reaches zero). */
  identified: boolean;
}

export interface Context {
  facts: Facts;
  ws: Workspace;
  w: Windows;
  through: string;
  /** Days from the first sales or spend row to the data-through date. */
  historyDays: number;
  /** false when history is under 120 days: real returns are not estimated and screens say so (docs/08 §3.4). */
  measured: boolean;
  sampleScale: number;
  sales: { week: SalesTotals; prior_week: SalesTotals; d28: SalesTotals; prior_d28: SalesTotals };
  media: {
    week: Record<Media, MediaTotals>;
    prior_week: Record<Media, MediaTotals>;
    d28: Record<Media, MediaTotals>;
    prior_d28: Record<Media, MediaTotals>;
  };
  mmm: MmmResult;
  real: Record<Media, RealReturn>;
  cacBySource: Partial<Record<OwnSiteCustomer['acquisition_source'], number>>;
}

export function buildContext(
  facts: Facts,
  ws: Workspace,
  opts: { sampleScale?: number; today?: string } = {},
): Context {
  // No sales yet (a sandbox company with only ads or reviews): the latest date of any data, else the sync day.
  const through =
    dataThrough(facts.sales_city_daily) ||
    [
      ...facts.spend_city_daily.map((r) => r.date),
      ...facts.reviews.map((r) => r.review_date),
      ...facts.market_captures.map((r) => r.captured_at.slice(0, 10)),
      ...facts.search_share_weekly.map((r) => r.week_ending),
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ||
    addDays(opts.today ?? new Date().toISOString().slice(0, 10), -1);
  const w = windowsFor(addDays(through, 1), ws.settings.week_starts_on);
  const s = (r: [string, string]) => salesTotals(facts.sales_city_daily, r);
  const m = (r: [string, string]) => mediaTotals(facts.spend_city_daily, r);
  const media = { week: m(w.week), prior_week: m(w.prior_week), d28: m(w.d28), prior_d28: m(w.prior_d28) };
  // History = days with both sales and paid media (creator posts alone do not count).
  let firstSale = through;
  let firstSpend = through;
  for (const r of facts.sales_city_daily) if (r.date && r.date < firstSale) firstSale = r.date;
  for (const r of facts.spend_city_daily)
    if (r.media !== 'creators' && r.date && r.date < firstSpend) firstSpend = r.date;
  const first = firstSale > firstSpend ? firstSale : firstSpend;
  const historyDays = through ? daysBetween(first, through) + 1 : 0;
  const measured = historyDays >= MIN_HISTORY_DAYS;
  const mmm = fitMmm(measured ? facts.sales_city_daily : [], measured ? facts.spend_city_daily : [], through);

  const real = Object.fromEntries(
    MEDIA.map((md) => {
      if (!measured) return [md, { roas: 0, low: 0, high: 0, confidence: 'low', identified: false }];
      const b = mmm.beta[md];
      const claimed = media.d28[md].claimed_roas ?? 0;
      const identified = b.low > 0;
      // v1 display rule: a medium the regression cannot separate is shown at no more than its platform claim.
      const roas = identified ? b.est : Math.min(b.est, claimed);
      const width = b.high - b.low;
      const confidence: RealReturn['confidence'] = !identified ? 'low' : width < 0.6 * roas ? 'medium' : 'low';
      return [
        md,
        {
          roas,
          low: Math.min(b.low, roas),
          high: identified ? b.high : Math.max(roas, Math.min(b.high, claimed)),
          confidence,
          identified,
        },
      ];
    }),
  ) as Record<Media, RealReturn>;

  const sampleScale = opts.sampleScale ?? 1;
  // CAC by acquisition source over the last 365 days: spend × own-site share ÷ new buyers from that source.
  const newBy = new Map<string, number>();
  for (const c of facts.customers_own_site)
    if (inRange(c.first_order_date, w.d365))
      newBy.set(c.acquisition_source, (newBy.get(c.acquisition_source) ?? 0) + 1);
  const spend365 = mediaTotals(facts.spend_city_daily, w.d365);
  const cacBySource: Context['cacBySource'] = {};
  for (const src of ['meta', 'google', 'creators'] as const) {
    const buyers = (newBy.get(src) ?? 0) * sampleScale;
    if (buyers) cacBySource[src] = (spend365[src].spend_inr * (OWN_SITE_SHARE[src] ?? 0)) / buyers;
  }
  // Referral: the reward is the referral discount on the first order (v1).
  const referralFirst = facts.orders_own_site.filter(
    (o) => o.first_order && inRange(o.date, w.d365) && facts.customers_own_site.length && o.discount_inr > 0,
  );
  const referralKeys = new Set(
    facts.customers_own_site.filter((c) => c.acquisition_source === 'referral').map((c) => c.customer_key),
  );
  const ref = referralFirst.filter((o) => referralKeys.has(o.customer_key));
  if (ref.length) cacBySource.referral = ref.reduce((a, o) => a + o.discount_inr, 0) / ref.length;
  cacBySource.organic = 0;
  cacBySource.unknown = 0;

  return {
    facts,
    ws,
    w,
    through,
    historyDays,
    measured,
    sampleScale,
    sales: { week: s(w.week), prior_week: s(w.prior_week), d28: s(w.d28), prior_d28: s(w.prior_d28) },
    media,
    mmm,
    real,
    cacBySource,
  };
}

/**
 * True when the own-site customer file is a fixed sample of buyers with no first orders in the last 28 days
 * (the demo files are such a cohort, docs/11 §9): buyer counts then cannot be compared across windows.
 */
export function isBuyerCohortSample(ctx: Context): boolean {
  return ctx.sampleScale > 1 && !ctx.facts.customers_own_site.some((c) => inRange(c.first_order_date, ctx.w.d28));
}

/** Acquisition spend attributed to the own site ÷ new own-site buyers, for a window (docs/08 §2). */
export function cacNewBuyers(ctx: Context, range: [string, string]): number {
  // With a sample of buyers a short window can hold too few new buyers: widen to 90, then 365 days (same end).
  for (const days of [0, 90, 365]) {
    const r: [string, string] = days ? [addDays(range[1], -(days - 1)), range[1]] : range;
    const sampled = ctx.facts.customers_own_site.filter((c) => inRange(c.first_order_date, r)).length;
    if (sampled < 30 && days !== 365) continue;
    const spend = mediaTotals(ctx.facts.spend_city_daily, r);
    const acq = (['meta', 'google', 'creators'] as const).reduce(
      (a, m) => a + spend[m].spend_inr * (OWN_SITE_SHARE[m] ?? 0),
      0,
    );
    return sampled ? acq / (sampled * ctx.sampleScale) : 0;
  }
  return 0;
}

/** Spend-weighted true ROAS for a window. */
export function trueRoas(ctx: Context, totals: Record<Media, MediaTotals>): number {
  const spend = MEDIA.reduce((a, m) => a + totals[m].spend_inr, 0);
  const real = MEDIA.reduce((a, m) => a + totals[m].spend_inr * ctx.real[m].roas, 0);
  return spend ? real / spend : 0;
}
