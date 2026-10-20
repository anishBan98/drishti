import { formatPct, formatPoints, formatShortDate, round, t, type Snapshot, type Suggestion } from '@drishti/shared';
import type { Context } from '../context';
import type { MarketCapture } from '../facts/types';
import { mean, median } from '../models/random';
import { suggest } from '../suggest';
import { tagReview } from '../voice/lexicon';
import { addDays, daysBetween } from '../windows';
import { count, kpi, money } from './common';

// Market (docs/08-METHODS.md §6), v1.

export interface PriceChange {
  label: string;
  platform: string;
  pct: number;
  date: string;
}

const per10 = (c: MarketCapture) => (c.pack_ml ? (c.price_inr / c.pack_ml) * 10 : 0);

/** §6.3: a change is ≥ 5% vs the median of the previous 3 captures and persists in the next capture (or 24 h). */
export function detectPriceChanges(captures: MarketCapture[]): PriceChange[] {
  const series = new Map<string, MarketCapture[]>();
  for (const c of captures) {
    const k = `${c.label}|${c.platform}`;
    series.set(k, [...(series.get(k) ?? []), c]);
  }
  const out: PriceChange[] = [];
  for (const list of series.values()) {
    list.sort((a, b) => (a.captured_at < b.captured_at ? -1 : 1));
    let last = list[0] ? median(list.slice(0, 3).map((c) => c.price_inr)) : 0;
    for (let i = 3; i < list.length; i++) {
      const base = median(list.slice(i - 3, i).map((c) => c.price_inr));
      const cur = list[i]!;
      const change = (cur.price_inr - base) / base;
      if (Math.abs(change) < 0.05) continue;
      const next = list[i + 1];
      const persists = next
        ? Math.abs((next.price_inr - cur.price_inr) / cur.price_inr) < 0.05 ||
          Date.parse(next.captured_at) - Date.parse(cur.captured_at) >= 86_400_000 * 2
        : true;
      const lasting = next ? Math.abs(next.price_inr - cur.price_inr) / cur.price_inr < 0.05 : true;
      if (!persists || !lasting || Math.abs(cur.price_inr - last) / last < 0.05) continue;
      out.push({ label: cur.label, platform: cur.platform, pct: round(change, 3), date: cur.captured_at.slice(0, 10) });
      last = cur.price_inr;
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.label < b.label ? -1 : 1));
}

function latestBy(captures: MarketCapture[], before?: string) {
  const out = new Map<string, MarketCapture>();
  for (const c of captures) {
    if (before && c.captured_at.slice(0, 10) > before) continue;
    const k = `${c.label}|${c.platform}`;
    const prev = out.get(k);
    if (!prev || c.captured_at > prev.captured_at) out.set(k, c);
  }
  return [...out.values()];
}

export function buildMarket(ctx: Context): { section: Snapshot['market']; changes: PriceChange[] } {
  const { w, ws } = ctx;
  const threshold = ws.settings.approval_threshold_inr;
  const caps = ctx.facts.market_captures;
  const latest = latestBy(caps);
  const ago14 = latestBy(caps, addDays(w.today, -14));
  const changes = detectPriceChanges(caps);
  const recent = changes.filter((c) => daysBetween(c.date, w.today) <= 21);
  const labels = [...new Set(latest.map((c) => c.label))].sort((a, b) =>
    a.includes('(you)') ? -1 : b.includes('(you)') ? 1 : a < b ? -1 : 1,
  );
  const usLabel = labels[0] ?? '';

  const rows = labels.map((label) => {
    const mine = latest.filter((c) => c.label === label);
    const best = [...mine].sort((a, b) => per10(a) - per10(b))[0]!;
    const before = ago14.find((c) => c.label === label && c.platform === best.platform);
    const reviews = mine.reduce((a, c) => a + c.review_count, 0);
    const rating = mine.reduce((a, c) => a + c.rating * c.review_count, 0) / (reviews || 1);
    return {
      label,
      brand: best.brand,
      platforms:
        mine.length >= 3
          ? t('market.where.all', { n: mine.length })
          : mine.length === 2
            ? t('market.where.plus', { platform: best.platform })
            : best.platform,
      platformList: mine.map((c) => c.platform),
      is_us: label === usLabel,
      price: best.price_inr,
      per10: round(per10(best), 1),
      change: before ? (best.price_inr - before.price_inr) / before.price_inr : null,
      rating: round(rating, 1),
      reviews,
      mrp: best.mrp_inr,
      inStockDays: 0,
    };
  });
  const us = rows.find((r) => r.is_us);
  const rivals = rows.filter((r) => !r.is_us);
  const medianPer10 = median(rivals.map((r) => r.per10));
  const catRating =
    rivals.reduce((a, r) => a + r.rating * r.reviews, 0) / (rivals.reduce((a, r) => a + r.reviews, 0) || 1);

  // Search share for the head query (first query in the data): latest week vs the 4 weeks before.
  const ss = ctx.facts.search_share_weekly;
  const head = ss[0]?.search_query ?? '';
  const headSeries = ss.filter((r) => r.search_query === head).sort((a, b) => (a.week_ending < b.week_ending ? -1 : 1));
  const ssNow = headSeries.at(-1)?.purchase_share ?? 0;
  const ssBefore = mean(headSeries.slice(-5, -1).map((r) => r.purchase_share));
  const ssChange = ssNow - ssBefore;

  // Perception (§6.2): gentle ↔ clinical from review words; value ↔ premium from words and price position.
  const ourReviews = ctx.facts.reviews.slice(-2000);
  const ourGentle = ourReviews.filter((r) => tagReview(r).some((a) => a.aspect === 'gentle' && a.sentiment > 0)).length;
  const ourResults = ourReviews.filter((r) =>
    tagReview(r).some((a) => a.aspect === 'results' && a.sentiment > 0),
  ).length;
  const sdPer10 = Math.sqrt(mean(rows.map((r) => (r.per10 - mean(rows.map((x) => x.per10))) ** 2))) || 1;
  const meanPer10 = mean(rows.map((r) => r.per10));

  const products = rows.map((r) => {
    const z = Math.max(-1, Math.min(1, (r.per10 - meanPer10) / sdPer10));
    const lex = r.is_us ? (ourResults - ourGentle) / (ourResults + ourGentle + 5) : 0;
    const cut = recent.find((c) => c.label === r.label && c.pct <= -0.1);
    const rise = recent.find((c) => c.label === r.label && c.pct >= 0.05);
    let threat: Snapshot['market']['products'][number]['threat'] = 'Low threat';
    if (r.is_us) threat = 'You';
    else if (us && ((cut && ssChange < -0.005) || (r.rating >= us.rating + 0.1 && r.per10 <= us.per10)))
      threat = 'High threat';
    else if (rise) threat = 'Opportunity';
    else if (us && r.per10 < 0.65 * us.per10) threat = 'Different buyer';
    else if (us && Math.hypot((r.per10 - us.per10) / (sdPer10 * 2), (r.rating - us.rating) / 1) < 0.25)
      threat = 'Medium threat';

    const says = r.is_us
      ? ourGentle >= ourResults
        ? t('market.says.gentle')
        : t('market.says.results')
      : z < 0
        ? t('market.says.value')
        : t('market.says.premium');
    const headline = cut
      ? t('market.headline.price_cut', {
          rival: r.label,
          pct: formatPct(-cut.pct),
          date: formatShortDate(cut.date),
          platform: cut.platform,
        })
      : rise
        ? t('market.headline.price_rise', {
            rival: r.label,
            pct: formatPct(rise.pct),
            date: formatShortDate(rise.date),
          })
        : r.is_us
          ? t('market.headline.you', { per10: `₹${Math.round(r.per10)}`, median: `₹${Math.round(medianPer10)}` })
          : t('market.headline.steady', { rival: r.label });

    const list: Suggestion[] = [];
    if (cut && us && cut.platform === 'Amazon') {
      // §9.1: coupon to within 5% of the rival on price per 10 ml, in 5% steps.
      const gap = 1 - (r.per10 * 1.05) / us.per10;
      const discount = Math.min(40, Math.max(5, Math.ceil((gap * 100) / 5) * 5));
      const weeklyUs = weeklyUnits(ctx, cut.platform);
      const recovered = weeklyUs * 0.14 * 0.7;
      const expected = recovered * us.price * (1 - discount / 100) - weeklyUs * us.price * (discount / 100) * 0.1;
      list.push(
        suggest(
          {
            type: 'amazon_coupon',
            // The coupon's money at stake is its budget: discount cost on baseline units, capped at ₹3 L (docs/10 §4.1).
            moneyAtStakeInr: Math.min(300_000, weeklyUs * us.price * (discount / 100) * 3),
            context: `rival=${r.label}`,
            title: t('market.sg.coupon.title', { pct: discount, platform: cut.platform }),
            why: t('market.sg.coupon.why'),
            expectedInr: expected,
            expectedPer: 'week',
            confidence: 'medium',
            evidence: [
              {
                label: t('market.ev.rival_price', {
                  rival: r.label,
                  per10: `₹${Math.round(r.per10)}`,
                  us: `₹${Math.round(us.per10)}`,
                }),
              },
              { label: t('market.ev.cut_date', { date: formatShortDate(cut.date), pct: formatPct(-cut.pct) }) },
            ],
            params: {
              rival: r.label,
              platform: cut.platform,
              discount_pct: discount,
              weeks: 3,
              sku: heroSku(ctx),
              asin: heroAsin(ctx),
            },
            stepVars: { product: heroName(ctx), discount_pct: discount, weeks: 3 },
          },
          threshold,
        ),
      );
    }
    if (!r.is_us)
      list.push(
        suggest(
          {
            type: 'price_alert',
            context: `rival=${r.label}`,
            title: t('market.sg.alert.title', { rival: r.label }),
            why: cut ? t('market.sg.alert.why_cut') : t('market.sg.alert.why'),
            impactLabel: t('impact.label.watch'),
            confidence: 'high',
            params: { rival: r.label, condition: `rival_price_change_pct(label="${r.label}") <= -0.05` },
            stepVars: { rival: r.label },
          },
          threshold,
        ),
      );
    else
      list.push(
        suggest(
          {
            type: 'listing_update',
            context: 'rival=you',
            title: t('market.sg.listing.title'),
            why: t('market.sg.listing.why'),
            impactLabel: t('impact.label.rating'),
            confidence: 'low',
            params: { sku: heroSku(ctx) },
          },
          threshold,
        ),
      );

    return {
      id: r.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+$/, ''),
      label: r.label,
      brand: r.brand,
      platforms: r.platforms,
      is_us: r.is_us,
      price: r.price,
      per10: r.per10,
      change_14d_pct: r.change === null ? null : round(r.change, 3),
      rating: r.rating,
      reviews: r.reviews,
      perception: { gentle_clinical: round(lex, 2), value_premium: round(0.5 * lex + 0.5 * z, 2) },
      says,
      threat,
      headline,
      suggestions: list,
    };
  });

  // Open space: the quadrant with the fewest reviews behind it.
  const quadrants = ['gentle_premium', 'gentle_value', 'clinical_premium', 'clinical_value'] as const;
  const weight = (q: (typeof quadrants)[number]) =>
    products
      .filter(
        (p) =>
          p.perception.gentle_clinical < 0 === q.startsWith('gentle') &&
          p.perception.value_premium >= 0 === q.endsWith('premium'),
      )
      .reduce((a, p) => a + p.reviews, 0);
  const open = [...quadrants].sort((a, b) => weight(a) - weight(b))[0]!;

  const ourDiscount = us?.mrp ? 1 - us.price / us.mrp : 0;
  const rivalDiscount = median(rows.filter((r) => !r.is_us && r.mrp).map((r) => 1 - r.price / r.mrp!));
  const ourStockouts = new Set(
    caps
      .filter((c) => c.label === usLabel && !c.in_stock && daysBetween(c.captured_at.slice(0, 10), w.today) <= 28)
      .map((c) => `${c.platform}|${c.captured_at.slice(0, 10)}`),
  );
  const stockPlatform = [...ourStockouts][0]?.split('|')[0] ?? '';
  const high = products.find((p) => p.threat === 'High threat');
  const highCut = high && recent.find((c) => c.label === high.label && c.pct <= -0.1);
  const losing = !!high && ssChange < -0.005;

  return {
    changes,
    section: {
      verdict: {
        tone: losing ? 'bad' : high ? 'warn' : 'good',
        chip: t(losing ? 'verdict.losing_share' : 'verdict.holding'),
        text:
          losing && highCut
            ? t('market.verdict.losing', {
                rival: high.label,
                pct: formatPct(-highCut.pct),
                pts: formatPoints(-ssChange),
              })
            : t('market.verdict.holding'),
      },
      kpis: [
        kpi('per10', 'kpi.per10', us?.per10 ?? 0, `₹${Math.round(us?.per10 ?? 0)}`, {
          note: t('note.median', { value: `₹${Math.round(medianPer10)}` }),
          tone: 'neutral',
        }),
        kpi('rating', 'kpi.rating', us?.rating ?? 0, `${(us?.rating ?? 0).toFixed(1)} ★`, {
          note: t('note.category', { value: catRating.toFixed(1) }),
          tone: (us?.rating ?? 0) >= catRating ? 'good' : 'warn',
        }),
        kpi('reviews', 'kpi.reviews', us?.reviews ?? 0, count(us?.reviews ?? 0), { tone: 'neutral' }),
        kpi('search_share', 'kpi.search_share', ssNow, formatPct(ssNow), {
          delta: {
            value: round(ssChange, 4),
            unit: 'pts',
            direction: Math.abs(ssChange) < 0.002 ? 'flat' : ssChange > 0 ? 'up' : 'down',
            good: Math.abs(ssChange) < 0.002 ? null : ssChange > 0,
          },
        }),
        kpi('discount', 'kpi.discount', ourDiscount, formatPct(ourDiscount), {
          note: t('note.rivals', { value: formatPct(rivalDiscount) }),
          tone: 'neutral',
        }),
        kpi('stockout_days', 'kpi.stockout_days', ourStockouts.size, String(ourStockouts.size), {
          ...(stockPlatform ? { note: t('note.on_platform', { platform: stockPlatform }) } : {}),
          tone: ourStockouts.size ? 'warn' : 'good',
        }),
      ],
      category_label: ws.settings.category_label,
      median_per10: round(medianPer10, 1),
      category_rating: round(catRating, 2),
      products,
      price_changes: recent.map((c) => ({ ...c })),
      open_space: { quadrant: open, label: t(`market.open.${open}`) },
    },
  };
}

function weeklyUnits(ctx: Context, platform: string): number {
  const channel =
    platform.toLowerCase() === 'amazon' ? 'amazon' : platform.toLowerCase() === 'flipkart' ? 'flipkart' : 'nykaa';
  const sku = heroSku(ctx);
  const r = ctx.facts.sales_sku_daily.filter(
    (x) => x.channel === channel && x.sku === sku && x.date >= ctx.w.prior_d28[0] && x.date <= ctx.w.prior_d28[1],
  );
  return r.reduce((a, x) => a + x.units, 0) / 4;
}
export const heroSku = (ctx: Context) =>
  ctx.facts.products.find((p) => p.hero)?.sku ?? ctx.facts.products[0]?.sku ?? '';
export const heroAsin = (ctx: Context) => ctx.facts.products.find((p) => p.hero)?.asin ?? '';
export const heroName = (ctx: Context) => ctx.facts.products.find((p) => p.hero)?.name ?? '';
export { money };
