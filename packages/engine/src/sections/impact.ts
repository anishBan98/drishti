import {
  MEDIA,
  MEDIA_LABEL,
  formatPct,
  formatRoas,
  joinList,
  round,
  t,
  type Media,
  type Snapshot,
  type Suggestion,
} from '@drishti/shared';
import { cacNewBuyers, OWN_SITE_SHARE, trueRoas, type Context } from '../context';
import { suggest } from '../suggest';
import { addDays, daysBetween, inRange } from '../windows';
import { delta, kpi, money } from './common';

// Impact and ROI (docs/08-METHODS.md §3, §3.5). v1: real return per medium from the MMM-lite regression
// (models/mmm.ts); natural experiments, synthetic control and calibration arrive in milestone M6.

const ACQ_LABEL: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  creators: 'Creators',
  referral: 'Referrals',
};

export function buildImpact(ctx: Context): {
  section: Snapshot['impact'];
  byMedia: Partial<Record<Media, Suggestion[]>>;
} {
  const { w, media, sales, real, ws } = ctx;
  const threshold = ws.settings.approval_threshold_inr;
  const d28 = media.d28;
  const spend = MEDIA.reduce((a, m) => a + d28[m].spend_inr, 0);
  const claimed = MEDIA.reduce((a, m) => a + d28[m].platform_claimed_revenue_inr, 0);
  const realSales = MEDIA.reduce((a, m) => a + d28[m].spend_inr * real[m].roas, 0);
  const tr = trueRoas(ctx, d28);
  const trPrior = trueRoas(ctx, media.prior_d28);
  const cac = cacNewBuyers(ctx, w.d28);
  const cacPrior = cacNewBuyers(ctx, w.prior_d28);

  // 12-month value per own-site buyer by acquisition source (v1 projection: first order + repeat revenue rate × 12).
  const ordersBy = new Map<string, { date: string; net: number }[]>();
  for (const o of ctx.facts.orders_own_site)
    ordersBy.set(o.customer_key, [...(ordersBy.get(o.customer_key) ?? []), { date: o.date, net: o.net_inr }]);
  const marginRatio = ownSiteMarginRatio(ctx);
  const acquisition = (['meta', 'google', 'creators', 'referral'] as const)
    .map((src) => {
      const custs = ctx.facts.customers_own_site.filter(
        (c) => c.acquisition_source === src && inRange(c.first_order_date, w.d365),
      );
      let first = 0;
      let repeat = 0;
      let months = 0;
      for (const c of custs) {
        const os = (ordersBy.get(c.customer_key) ?? []).sort((a, b) => (a.date < b.date ? -1 : 1));
        first += os[0]?.net ?? 0;
        repeat += os.slice(1).reduce((a, o) => a + o.net, 0);
        months += Math.max(0.5, daysBetween(c.first_order_date, w.d365[1]) / 30.4);
      }
      const value = custs.length ? first / custs.length + (months ? (repeat / months) * 12 : 0) : 0;
      const c = ctx.cacBySource[src] ?? 0;
      const monthlyMargin = (value * marginRatio) / 12;
      return {
        source: ACQ_LABEL[src]!,
        cac: Math.round(c),
        value_12m: Math.round(value),
        ltv_cac: c ? round(value / c, 2) : 0,
        payback_months: monthlyMargin ? round(c / monthlyMargin, 1) : 0,
      };
    })
    .filter((a) => a.cac > 0);
  const ltvCac = acquisition.length
    ? acquisition.reduce((a, r) => a + r.value_12m, 0) / acquisition.reduce((a, r) => a + r.cac, 0)
    : 0;

  const runningTests = ws.tests.filter((x) => x.status === 'running' && x.start_date <= w.today);
  const tests = runningTests.map((x) => {
    const days = daysBetween(x.start_date, x.end_date) + 1;
    const day = Math.min(days, daysBetween(x.start_date, w.today) + 1);
    return {
      id: x.test_id,
      name: t('impact.test.name', { name: x.name, cities: joinList(x.test_regions) }),
      day,
      days,
      readout: x.end_date,
      note: t('impact.test.note', { medium: MEDIA_LABEL[x.media as Media] ?? x.media }),
    };
  });

  const byMedia: Partial<Record<Media, Suggestion[]>> = {};
  // A cut saves the spend and loses the real sales it bought, at the own-site contribution margin.
  const margin = marginRatio;
  const channels = MEDIA.map((m) => {
    const r = real[m];
    const sp = d28[m].spend_inr;
    const cl = d28[m].platform_claimed_revenue_inr;
    const claimedPer100 = sp ? (100 * cl) / sp : 0;
    const realPer100 = 100 * r.roas;
    const test = runningTests.find((x) => x.media === m);
    const evidence = test
      ? t('impact.evidence.test', { cities: joinList(test.test_regions) })
      : r.identified
        ? t('impact.evidence.regression')
        : t('impact.evidence.unidentified');
    const under = realPer100 > claimedPer100;
    const headline = t(under ? 'impact.headline.under' : 'impact.headline.over', {
      medium: MEDIA_LABEL[m],
      claimed: (claimedPer100 / 100).toFixed(2).replace(/0$/, ''),
      real: (realPer100 / 100).toFixed(2),
    });

    const list: Suggestion[] = [];
    const monthlySpend = (sp / 28) * 30;
    if (realPer100 < 160 && !under && r.identified) {
      const cut = Math.round((monthlySpend * 0.15) / 100_000) * 100_000;
      list.push(
        suggest(
          {
            type: 'budget_change',
            context: `media=${m}`,
            title: t('impact.sg.cut.title', { medium: MEDIA_LABEL[m], amount: money(cut) }),
            why: t('impact.sg.cut.why', { real: `₹${Math.round(realPer100)}` }),
            expectedInr: cut * (1 - r.roas * margin),
            expectedPer: 'month',
            impactLabel: t('impact.label.margin', { value: '+' + money(cut * Math.max(0, 1 - r.roas * margin)) }),
            confidence: r.confidence,
            params: { medium: m, change_inr_per_month: -cut },
            stepVars: { medium: MEDIA_LABEL[m] },
          },
          threshold,
        ),
      );
    }
    if (under) {
      const add = Math.round((monthlySpend * 0.3) / 100_000) * 100_000;
      list.push(
        suggest(
          {
            type: 'creator_budget',
            context: `media=${m}`,
            title: t('impact.sg.increase.title', { medium: MEDIA_LABEL[m], amount: money(add) }),
            why: t('impact.sg.increase.why', {
              real: `₹${Math.round(realPer100)}`,
              claimed: `₹${Math.round(claimedPer100)}`,
            }),
            expectedInr: add * (r.roas - 1),
            expectedPer: 'month',
            confidence: r.confidence,
            params: { medium: m, change_inr_per_month: add },
          },
          threshold,
        ),
      );
    }
    list.push(
      suggest(
        {
          type: 'geo_test',
          context: `media=${m}`,
          title: test
            ? t('impact.sg.extend.title', { name: test.name })
            : t('impact.sg.test.title', { medium: MEDIA_LABEL[m] }),
          why: test ? t('impact.sg.extend.why') : t('impact.sg.test.why', { medium: MEDIA_LABEL[m] }),
          impactLabel: t('impact.label.confidence'),
          confidence: 'medium',
          params: { medium: m, ...(test ? { test_id: test.test_id, extend_days: 9 } : {}) },
        },
        threshold,
      ),
    );
    byMedia[m] = list;
    return {
      id: m,
      label: MEDIA_LABEL[m],
      spend: sp,
      claimed: cl,
      real: Math.round(sp * r.roas),
      real_low: Math.round(sp * r.low),
      real_high: Math.round(sp * r.high),
      claimed_per100: round(claimedPer100, 1),
      real_per100: round(realPer100, 1),
      confidence: test && r.identified ? 'medium' : r.confidence,
      evidence,
      headline,
      suggestions: list,
    };
  });

  const over = claimed > realSales * 1.2;
  const revenue = sales.d28.net_revenue_inr;
  return {
    byMedia,
    section: {
      verdict: {
        tone: over ? 'bad' : 'good',
        chip: t(over ? 'verdict.over_credited' : 'verdict.credited_fairly'),
        text: t('impact.verdict', { claimed: money(claimed), revenue: money(revenue), real: money(realSales) }),
      },
      kpis: [
        kpi('ad_spend', 'kpi.ad_spend', spend, money(spend), {
          note: t('note.pct_of_revenue', { pct: formatPct(spend / revenue) }),
          tone: 'neutral',
        }),
        kpi('claimed_roas', 'kpi.claimed_roas', claimed / spend, formatRoas(claimed / spend), {
          note: t('note.platform_reports'),
          tone: 'neutral',
        }),
        kpi('true_roas', 'kpi.true_roas', tr, formatRoas(tr), { delta: delta('true_roas', tr, trPrior, 'x') }),
        kpi('real_sales', 'kpi.real_sales', realSales, money(realSales), {
          note: t('note.pct_of_revenue', { pct: formatPct(realSales / revenue) }),
          tone: 'neutral',
        }),
        kpi('cac', 'kpi.cac', cac, money(cac), { delta: delta('cac', cac, cacPrior) }),
        kpi('ltv_cac', 'kpi.ltv_cac', ltvCac, formatRoas(ltvCac), {
          note: t('note.target', { value: `${ws.settings.target_ltv_to_cac}x` }),
          tone: ltvCac >= ws.settings.target_ltv_to_cac ? 'good' : 'warn',
        }),
      ],
      channels,
      acquisition,
      tests,
    },
  };
}

/** Own-site contribution margin ratio: 1 − unit costs ÷ net revenue − payment fee − shipping share (v1). */
export function ownSiteMarginRatio(ctx: Context): number {
  const cost = new Map(ctx.facts.products.map((p) => [p.sku, p.unit_cost_inr]));
  const units = ctx.facts.order_lines_own_site.reduce((a, l) => a + (cost.get(l.sku) ?? 0) * l.qty, 0);
  const net = ctx.facts.orders_own_site.reduce((a, o) => a + o.net_inr, 0);
  const fees = ctx.ws.channels.find((c) => c.channel === 'own_site');
  const shipping = (fees?.shipping_per_order_inr ?? 0) * ctx.facts.orders_own_site.length;
  return net ? Math.max(0.05, 1 - units / net - (fees?.payment_fee_pct ?? 0) - shipping / net) : 0.5;
}

export { OWN_SITE_SHARE, addDays };
