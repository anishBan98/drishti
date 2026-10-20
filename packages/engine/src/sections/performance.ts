import {
  CHANNELS,
  CHANNEL_COLOR,
  CHANNEL_LABEL,
  formatPct,
  round,
  t,
  type Channel,
  type Snapshot,
  type Suggestion,
} from '@drishti/shared';
import { isBuyerCohortSample, type Context } from '../context';
import { salesByChannel, salesTotals } from '../kpi';
import { inRange, addDays, type Range } from '../windows';
import { count, delta, kpi, money } from './common';

// Performance (docs/08-METHODS.md §5): 12 complete weeks by channel; channel table over 28 days vs prior 28.

export function weeklySeries(ctx: Context, weeks = 12) {
  const ends = Array.from({ length: weeks }, (_, i) => addDays(ctx.w.week[1], -7 * (weeks - 1 - i)));
  const ranges: Range[] = ends.map((e) => [addDays(e, -6), e]);
  const revenue_by_channel = Object.fromEntries(
    CHANNELS.map((c) => [
      c,
      ranges.map((r) => salesTotals(ctx.facts.sales_city_daily, r, (x) => x.channel === c).net_revenue_inr),
    ]),
  ) as Record<Channel, number[]>;
  const totals = ranges.map((r) => salesTotals(ctx.facts.sales_city_daily, r));
  const buyers = ranges.map(
    (r) =>
      new Set(ctx.facts.orders_own_site.filter((o) => inRange(o.date, r)).map((o) => o.customer_key)).size *
      ctx.sampleScale,
  );
  return {
    weeks: ranges.map(([from]) => from),
    revenue_by_channel,
    orders: totals.map((x) => x.orders),
    aov: totals.map((x) => round(x.aov_inr, 2)),
    buyers,
  };
}

function ownSiteBuyers(ctx: Context, r: Range) {
  const orders = ctx.facts.orders_own_site.filter((o) => inRange(o.date, r));
  const buyers = new Set(orders.map((o) => o.customer_key)).size;
  return { orders: orders.length, buyers };
}

/** 90-day repeat: buyers whose first order was 91–180 days ago and who ordered again within 90 days of it. */
function repeat90(ctx: Context, asOf: string): number {
  const from = addDays(asOf, -180);
  const to = addDays(asOf, -91);
  const firsts = ctx.facts.customers_own_site.filter((c) => c.first_order_date >= from && c.first_order_date <= to);
  if (!firsts.length) return 0;
  const byKey = new Map<string, string[]>();
  for (const o of ctx.facts.orders_own_site) byKey.set(o.customer_key, [...(byKey.get(o.customer_key) ?? []), o.date]);
  const again = firsts.filter((c) =>
    (byKey.get(c.customer_key) ?? []).some((d) => d > c.first_order_date && d <= addDays(c.first_order_date, 90)),
  );
  return again.length / firsts.length;
}

export function buildPerformance(
  ctx: Context,
  channelSuggestions: Partial<Record<Channel, Suggestion[]>>,
): Snapshot['performance'] {
  const { w, sales } = ctx;
  const cur = salesByChannel(ctx.facts.sales_city_daily, w.d28);
  const pri = salesByChannel(ctx.facts.sales_city_daily, w.prior_d28);
  const own = ownSiteBuyers(ctx, w.d28);
  const ownPrior = ownSiteBuyers(ctx, w.prior_d28);
  const rev = delta('revenue', sales.d28.net_revenue_inr, sales.prior_d28.net_revenue_inr);
  const rep = repeat90(ctx, w.today);
  const repPrior = repeat90(ctx, addDays(w.today, -28));
  const weekly = weeklySeries(ctx);
  const total = sales.d28.net_revenue_inr;

  const channels = CHANNELS.map((c) => {
    const g = pri[c].net_revenue_inr ? (cur[c].net_revenue_inr - pri[c].net_revenue_inr) / pri[c].net_revenue_inr : 0;
    const share = total ? cur[c].net_revenue_inr / total : 0;
    const headline =
      g < -0.02
        ? t('perf.headline.falling', { channel: CHANNEL_LABEL[c], pct: formatPct(-g) })
        : cur[c].return_rate > sales.d28.return_rate * 1.4
          ? t('perf.headline.returns', { channel: CHANNEL_LABEL[c], pct: formatPct(cur[c].return_rate) })
          : g > 0.02
            ? t('perf.headline.growing', { channel: CHANNEL_LABEL[c], pct: formatPct(g), share: formatPct(share) })
            : t('perf.headline.steady', { channel: CHANNEL_LABEL[c], share: formatPct(share) });
    const notes = [
      t('perf.note.share', { share: formatPct(share) }),
      t('perf.note.aov', { aov: money(cur[c].aov_inr), prior: money(pri[c].aov_inr) }),
      c === 'own_site' ? t('perf.note.buyers_own') : t('perf.note.buyers_marketplace'),
    ];
    return {
      id: c,
      label: CHANNEL_LABEL[c],
      color: CHANNEL_COLOR[c],
      revenue: cur[c].net_revenue_inr,
      growth_pct: round(g, 4),
      orders: cur[c].orders,
      aov: Math.round(cur[c].aov_inr),
      ...(c === 'own_site' ? { buyers: own.buyers * ctx.sampleScale } : {}),
      return_pct: round(cur[c].return_rate, 4),
      share_pct: round(share, 4),
      headline,
      notes,
      suggestions: channelSuggestions[c] ?? [],
    };
  });

  const fastest = [...channels].sort((a, b) => b.growth_pct - a.growth_pct)[0]!;
  const slowest = [...channels].sort((a, b) => a.growth_pct - b.growth_pct)[0]!;
  const up = rev.value > 0.02;
  const down = rev.value < -0.02;
  const opb = own.buyers ? own.orders / own.buyers : 0;
  const opbPrior = ownPrior.buyers ? ownPrior.orders / ownPrior.buyers : 0;

  return {
    verdict: {
      tone: up ? 'good' : down ? 'bad' : 'warn',
      chip: t(up ? 'verdict.growing' : down ? 'verdict.shrinking' : 'verdict.flat'),
      text: up
        ? t('perf.verdict.up', { pct: formatPct(rev.value), channel: fastest.label })
        : down
          ? t('perf.verdict.down', { pct: formatPct(-rev.value), channel: slowest.label })
          : t('perf.verdict.flat', { revenue: money(total) }),
    },
    kpis: [
      kpi('revenue', 'kpi.net_revenue', total, money(total), {
        delta: rev,
        spark: weekly.weeks.map((_, i) => CHANNELS.reduce((a, c) => a + weekly.revenue_by_channel[c][i]!, 0)).slice(-8),
      }),
      kpi('orders', 'kpi.orders', sales.d28.orders, count(sales.d28.orders), {
        delta: delta('orders', sales.d28.orders, sales.prior_d28.orders),
        spark: weekly.orders.slice(-8),
      }),
      kpi('aov', 'kpi.aov', sales.d28.aov_inr, money(sales.d28.aov_inr), {
        delta: delta('aov', sales.d28.aov_inr, sales.prior_d28.aov_inr),
        spark: weekly.aov.slice(-8),
      }),
      kpi('customers', 'kpi.customers', own.buyers * ctx.sampleScale, count(own.buyers * ctx.sampleScale), {
        ...(isBuyerCohortSample(ctx) ? {} : { delta: delta('buyers', own.buyers, ownPrior.buyers) }),
        note: isBuyerCohortSample(ctx) ? t('note.sample_cohort') : t('note.own_site_only'),
        tone: 'neutral',
      }),
      kpi('orders_per_buyer', 'kpi.orders_per_buyer', opb, opb.toFixed(2), { delta: delta('repeat', opb, opbPrior) }),
      kpi('repeat_90d', 'kpi.repeat_90d', rep, formatPct(rep), { delta: delta('repeat', rep, repPrior, 'pts') }),
    ],
    weekly,
    channels,
  };
}
