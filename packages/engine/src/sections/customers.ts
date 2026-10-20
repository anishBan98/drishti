import { formatPct, formatRoas, round, t, type CopyKey, type Snapshot, type Suggestion } from '@drishti/shared';
import { isBuyerCohortSample, type Context } from '../context';
import { segmentCustomers, type SegmentStats } from '../models/segments';
import { suggest } from '../suggest';
import { addDays, inRange } from '../windows';
import { count, delta, kpi, money } from './common';

// Customers (docs/08-METHODS.md §7). k-means on own-site buyers; sample counts scaled to totals.

const TAG: Record<string, CopyKey> = {
  preferred: 'customers.tag.preferred',
  problem: 'customers.tag.problem',
  'Festive Gifters': 'customers.tag.seasonal',
  'One-time Trialists': 'customers.tag.losing',
  'Ingredient Explorers': 'customers.tag.launch',
};

export function buildCustomers(ctx: Context): {
  section: Snapshot['customers'];
  problem?: SegmentStats;
  segments: Snapshot['customers']['segments'];
} {
  const { w, ws } = ctx;
  const threshold = ws.settings.approval_threshold_inr;
  const seg = segmentCustomers({
    orders: ctx.facts.orders_own_site,
    lines: ctx.facts.order_lines_own_site,
    customers: ctx.facts.customers_own_site,
    products: ctx.facts.products,
    calendar: ws.calendar,
    w,
    cacBySource: ctx.cacBySource,
  });
  const buyers = seg.segments.reduce((a, s) => a + s.customers, 0) * ctx.sampleScale;
  const priorBuyers =
    new Set(
      ctx.facts.orders_own_site
        .filter((o) => inRange(o.date, [addDays(w.d365[0], -28), addDays(w.d365[1], -28)]))
        .map((o) => o.customer_key),
    ).size * ctx.sampleScale;

  const segments = seg.segments.map((s) => {
    const list: Suggestion[] = [];
    if (s.kind === 'problem') {
      const savedMonthly =
        ((s.discount_pct * s.aov * s.customers * ctx.sampleScale * s.orders_per_year) / 12) * 0.35 * (1 - 0.05);
      list.push(
        suggest(
          {
            type: 'shopify_discount_cap',
            context: `segment=${s.name}`,
            title: t('customers.sg.cap.title', { pct: 15 }),
            why: t('customers.sg.cap.why'),
            expectedInr: savedMonthly,
            expectedPer: 'month',
            impactLabel: t('impact.label.margin', { value: '+' + money(savedMonthly) }),
            confidence: 'medium',
            params: { segment_id: s.name, cap_pct: 15 },
            stepVars: { segment: s.name, cap_pct: 15 },
          },
          threshold,
        ),
      );
      const rtoSaved = (s.cod_pct * s.rto_pct * s.aov * s.customers * ctx.sampleScale * s.orders_per_year * 0.4) / 12;
      // Without returned-order data there is nothing for an OTP to save.
      if (rtoSaved > 0)
        list.push(
          suggest(
            {
              type: 'cod_otp',
              context: `segment=${s.name}`,
              title: t('customers.sg.otp.title', { amount: '₹500' }),
              why: t('customers.sg.otp.why'),
              expectedInr: rtoSaved,
              expectedPer: 'month',
              impactLabel: t('impact.label.returns', { value: '−' + money(rtoSaved) }),
              confidence: 'medium',
              params: { segment_id: s.name, min_order_inr: 500 },
            },
            threshold,
          ),
        );
    } else if (s.kind === 'preferred') {
      list.push(
        suggest(
          {
            type: 'audience_export',
            context: `segment=${s.name}`,
            title: t('customers.sg.lookalike.title', { segment: s.name }),
            why: t('customers.sg.lookalike.why', { ratio: formatRoas(s.ltv_cac) }),
            impactLabel: t('impact.label.confidence'),
            confidence: 'medium',
            params: { segment_id: s.name },
            stepVars: { segment: s.name },
          },
          threshold,
        ),
      );
      list.push(
        suggest(
          {
            type: 'refill_nudge',
            context: `segment=${s.name}`,
            title: t('customers.sg.refill.title'),
            why: t('customers.sg.refill.why'),
            expectedInr: (s.customers * ctx.sampleScale * 0.05 * s.aov) / 12,
            expectedPer: 'month',
            confidence: 'low',
            params: { segment_id: s.name, day: 21 },
          },
          threshold,
        ),
      );
    } else {
      list.push(
        suggest(
          {
            type: 'shopify_segment_offer',
            context: `segment=${s.name}`,
            title: t('customers.sg.offer.title', { segment: s.name }),
            why: t('customers.sg.offer.why'),
            expectedInr: (s.customers * ctx.sampleScale * 0.03 * s.aov) / 12,
            expectedPer: 'month',
            confidence: 'low',
            params: { segment_id: s.name },
          },
          threshold,
        ),
      );
    }
    const headline =
      s.kind === 'problem'
        ? t(s.rto_pct > 0 ? 'customers.headline.problem' : 'customers.headline.problem_no_rto', {
            buyers_pct: Math.round(s.buyers_pct * 100),
            revenue_pct: Math.round(s.revenue_pct * 100),
            rto_pct: Math.round(s.rto_pct * 100),
          })
        : s.kind === 'preferred'
          ? t('customers.headline.preferred', {
              buyers_pct: Math.round(s.buyers_pct * 100),
              revenue_pct: Math.round(s.revenue_pct * 100),
              ratio: formatRoas(s.ltv_cac),
            })
          : t('customers.headline.other', {
              buyers_pct: Math.round(s.buyers_pct * 100),
              revenue_pct: Math.round(s.revenue_pct * 100),
              orders: s.orders_per_year.toFixed(1),
            });
    return {
      id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: s.name,
      kind: s.kind,
      buyers_pct: round(s.buyers_pct, 4),
      revenue_pct: round(s.revenue_pct, 4),
      aov: Math.round(s.aov),
      orders_per_year: round(s.orders_per_year, 2),
      repeat_pct: round(s.repeat_pct, 4),
      cac: Math.round(s.cac),
      ltv_12m: Math.round(s.ltv_12m),
      ltv_cac: round(s.ltv_cac, 2),
      discount_pct: round(s.discount_pct, 4),
      cod_pct: round(s.cod_pct, 4),
      rto_pct: round(s.rto_pct, 4),
      centroid: { orders: round(s.centroid.orders, 2), aov: Math.round(s.centroid.aov) },
      sample: s.sample,
      tag: t(TAG[s.kind] ?? TAG[s.name] ?? 'customers.tag.other'),
      headline,
      suggestions: list,
    };
  });

  const problem = seg.segments.find((s) => s.kind === 'problem');
  const preferred = seg.segments.find((s) => s.kind === 'preferred');
  const year = ctx.facts.orders_own_site.filter((o) => inRange(o.date, w.d365));
  const repeatShare =
    seg.segments.reduce((a, s) => a + s.repeat_pct * s.customers, 0) / (buyers / ctx.sampleScale || 1);
  const value12 = seg.segments.reduce((a, s) => a + s.ltv_12m * s.customers, 0) / (buyers / ctx.sampleScale || 1);
  const cod = year.filter((o) => o.payment_method === 'COD');
  const undelivered = year.length ? year.filter((o) => o.status === 'RTO').length / year.length : 0;
  void cod;

  return {
    problem,
    segments,
    section: {
      verdict: problem
        ? {
            tone: 'warn',
            chip: t('verdict.mixed_base'),
            text: t('customers.verdict', {
              name: problem.name,
              buyers: formatPct(problem.buyers_pct),
              revenue: formatPct(problem.revenue_pct),
            }),
          }
        : { tone: 'good', chip: t('verdict.healthy_base'), text: t('customers.verdict.healthy') },
      kpis: [
        kpi(
          'buyers',
          'kpi.buyers',
          buyers,
          count(buyers),
          isBuyerCohortSample(ctx)
            ? { note: t('note.sample_cohort'), tone: 'neutral' }
            : { delta: delta('buyers', buyers, priorBuyers) },
        ),
        kpi('bought_again', 'kpi.bought_again', repeatShare, formatPct(repeatShare), { tone: 'neutral' }),
        kpi('value_12m', 'kpi.value_12m', value12, money(value12), { tone: 'neutral' }),
        kpi('preferred', 'kpi.preferred_share', preferred?.buyers_pct ?? 0, formatPct(preferred?.buyers_pct ?? 0), {
          note: preferred?.name ?? '',
          tone: 'good',
        }),
        kpi('problem', 'kpi.problem_share', problem?.buyers_pct ?? 0, formatPct(problem?.buyers_pct ?? 0), {
          note: problem?.name ?? '',
          tone: 'bad',
        }),
        kpi('undelivered', 'kpi.undelivered', undelivered, formatPct(undelivered), {
          tone: undelivered > 0.08 ? 'bad' : 'neutral',
        }),
      ],
      method: t('customers.method', { k: seg.k, n: seg.signals }),
      segments,
      stability: { ari_vs_last: null, k: seg.k, silhouette: round(seg.silhouette, 3) },
    },
  };
}
