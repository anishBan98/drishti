import { formatPct, formatShortDate, round, t, type CopyKey, type Snapshot, type Suggestion } from '@drishti/shared';
import type { Context } from '../context';
import type { AspectId, Review } from '../facts/types';
import { PUMP_MENTION } from '../kpi';
import { suggest } from '../suggest';
import { ASPECTS, tagReviews } from '../voice/lexicon';
import { addDays, daysBetween, inRange } from '../windows';
import { delta, kpi } from './common';

// Customer voice (docs/08-METHODS.md §8.3), v1 on lexicon tags.

/** Category net sentiment per aspect when no rival reviews are collected: a configured benchmark (docs/08 §8.3). */
export const CATEGORY_BENCHMARK: Record<AspectId, number> = {
  pump_packaging: 5,
  gentle: 31,
  results: 24,
  texture: 22,
  fragrance: 10,
  value: 14,
  delivery: 22,
  oxidation: -10,
  size_claim: 0,
  authenticity: 15,
};

const ASPECT_NAME = (a: AspectId) => t(`voice.aspect.${a}` as CopyKey);

/** Poisson upper-tail p-value P(X ≥ k | λ). */
function poissonTail(k: number, lambda: number): number {
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.max(0, 1 - cdf);
}

function platformsOf(list: Review[]): string {
  const by = new Map<string, number>();
  for (const r of list) by.set(r.platform, (by.get(r.platform) ?? 0) + 1);
  const top = [...by]
    .filter(([, n]) => n / list.length >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
  return top.length >= 4 ? t('voice.platforms.all') : top.join(', ');
}

export function buildVoice(ctx: Context): Snapshot['voice'] {
  const { w, ws } = ctx;
  const threshold = ws.settings.approval_threshold_inr;
  const reviews = tagReviews(ctx.facts.reviews);
  const r90 = reviews.filter((r) => inRange(r.review_date, w.d90));
  const r30 = reviews.filter((r) => inRange(r.review_date, w.d30));
  const prior30 = reviews.filter((r) => inRange(r.review_date, w.prior_d30));

  const mentions = (list: Review[], a: AspectId, s?: -1 | 1) =>
    list.filter((r) => r.aspects.some((x) => x.aspect === a && (s === undefined || x.sentiment === s)));

  const aspects = ASPECTS.map((a) => {
    const m = mentions(r90, a);
    const pos = m.filter((r) => r.aspects.some((x) => x.aspect === a && x.sentiment === 1)).length;
    const neg = m.filter((r) => r.aspects.some((x) => x.aspect === a && x.sentiment === -1)).length;
    const net = m.length ? Math.round(((pos - neg) / m.length) * 100) : 0;
    const cat = CATEGORY_BENCHMARK[a];
    const n30 = mentions(r30, a, -1).length;
    const np = mentions(prior30, a, -1).length;
    const tagKey: CopyKey =
      net < 0 && n30 > np * 1.5
        ? 'voice.tag.fix_now'
        : net >= cat + 15
          ? 'voice.tag.strength'
          : net < cat - 10
            ? 'voice.tag.behind'
            : n30 > np * 1.3
              ? 'voice.tag.watch'
              : 'voice.tag.at_par';
    const negList = mentions(r30, a, -1);
    const quotes = topTexts(negList.length ? negList : m, 2).map((r) => ({
      text: r.text,
      src: `${r.platform}, ${r.rating}★`,
    }));
    const list: Suggestion[] = [];
    if (tagKey === 'voice.tag.fix_now' && a === 'pump_packaging') {
      list.push(
        suggest(
          {
            type: 'qa_hold',
            context: `aspect=${a}`,
            title: t('voice.sg.qa.title'),
            why: t('voice.sg.qa.why', { n: n30 }),
            impactLabel: t('impact.label.stars', { value: '0.2' }),
            confidence: 'medium',
            evidence: [{ label: t('voice.ev.mentions', { n: n30, prior: np }) }],
            params: { aspect: a, sku: dominantSku(negList) },
          },
          threshold,
        ),
      );
      list.push(
        suggest(
          {
            type: 'reply_drafts',
            context: `aspect=${a}`,
            title: t('voice.sg.reply.title', { n: negList.filter((r) => !r.brand_replied).length }),
            why: t('voice.sg.reply.why'),
            impactLabel: t('impact.label.rating'),
            confidence: 'low',
            params: { aspect: a, remedy: 'free replacement pump' },
            stepVars: { aspect: ASPECT_NAME(a).toLowerCase() },
          },
          threshold,
        ),
      );
    } else if (tagKey === 'voice.tag.strength') {
      list.push(
        suggest(
          {
            type: 'listing_update',
            context: `aspect=${a}`,
            title: t('voice.sg.lead.title', { aspect: ASPECT_NAME(a).toLowerCase() }),
            why: t('voice.sg.lead.why', { net: net, cat }),
            impactLabel: t('impact.label.rating'),
            confidence: 'low',
            params: { aspect: a },
          },
          threshold,
        ),
      );
    } else if (a === 'delivery' || a === 'size_claim') {
      list.push(
        suggest(
          {
            type: 'packaging_request',
            context: `aspect=${a}`,
            title: t('voice.sg.packaging.title'),
            why: t('voice.sg.packaging.why', { n: n30 }),
            impactLabel: t('impact.label.rating'),
            confidence: 'low',
            params: { aspect: a },
          },
          threshold,
        ),
      );
    } else {
      list.push(
        suggest(
          {
            type: 'brief',
            context: `aspect=${a}`,
            title: t('voice.sg.brief.title', { aspect: ASPECT_NAME(a).toLowerCase() }),
            why: t('voice.sg.brief.why'),
            impactLabel: t('impact.label.rating'),
            confidence: 'low',
            params: { aspect: a, kind: 'rnd' },
          },
          threshold,
        ),
      );
    }
    return {
      id: a,
      name: ASPECT_NAME(a),
      mentions: m.length,
      us: net,
      category: cat,
      tag: t(tagKey),
      headline:
        tagKey === 'voice.tag.fix_now'
          ? t('voice.headline.fix', { n: n30, aspect: ASPECT_NAME(a).toLowerCase() })
          : t('voice.headline.net', { aspect: ASPECT_NAME(a), net: signed(net), cat: signed(cat) }),
      quotes,
      suggestions: list,
    };
  })
    .filter((x) => x.mentions > 0)
    .sort((x, y) => y.mentions - x.mentions);

  // Emerging issues (§8.3) at aspect level in v1: negative mentions last 30 days vs the prior 30.
  const issues = ASPECTS.map((a) => {
    const cur = mentions(r30, a, -1);
    const pri = mentions(prior30, a, -1).length;
    const isNew = pri < 3;
    const flagged = cur.length >= 20 && (isNew || poissonTail(cur.length, Math.max(pri, 0.5)) < 0.01);
    if (!flagged) return null;
    return {
      title: topTexts(cur, 1)[0]?.text.replace(/[.!]+$/, '') ?? ASPECT_NAME(a),
      mentions: cur.length,
      change_pct: isNew ? null : round((cur.length - pri) / pri, 3),
      is_new: isNew,
      platforms: platformsOf(cur),
      first_seen: firstSeen(
        reviews.filter((r) => r.aspects.some((x) => x.aspect === a && x.sentiment === -1)),
        w.d30[1],
      ),
    };
  })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((x, y) => y.mentions - x.mentions);

  const rating90 = avg(r90.map((r) => r.rating));
  const ratingPrior = avg(
    reviews.filter((r) => inRange(r.review_date, [addDays(w.d90[0], -90), addDays(w.d90[0], -1)])).map((r) => r.rating),
  );
  const ratingRecent = avg(r30.map((r) => r.rating));
  const ratingBefore = avg(prior30.map((r) => r.rating));
  const posShare = share(r30, 1);
  const negShare = share(r30, -1);
  const pumpShare = r30.length ? r30.filter((r) => PUMP_MENTION.test(r.text)).length / r30.length : 0;
  const pumpBefore = prior30.length ? prior30.filter((r) => PUMP_MENTION.test(r.text)).length / prior30.length : 0;
  const replied = r90.length ? r90.filter((r) => r.brand_replied).length / r90.length : 0;
  const platforms = new Set(r90.map((r) => r.platform)).size;
  const fix = aspects.find((x) => x.tag === t('voice.tag.fix_now'));
  const slipping = ratingRecent < ratingBefore - 0.05 || !!fix;

  return {
    verdict: slipping
      ? {
          tone: 'bad',
          chip: t('verdict.rating_slipping'),
          text: t('voice.verdict.slipping', { aspect: fix?.name ?? t('voice.aspect.results') }),
        }
      : { tone: 'good', chip: t('verdict.rating_steady'), text: t('voice.verdict.steady') },
    kpis: [
      kpi('rating_90d', 'kpi.rating_90d', rating90, `${rating90.toFixed(1)} ★`, {
        delta: delta('rating', rating90, ratingPrior || rating90, 'pts'),
      }),
      kpi('reviews_read', 'kpi.reviews_read', r90.length, r90.length.toLocaleString('en-IN'), {
        note: t('note.platforms', { n: platforms }),
        tone: 'neutral',
      }),
      kpi('positive', 'kpi.positive', posShare, formatPct(posShare), {
        delta: delta('share', posShare, share(prior30, 1), 'pts'),
      }),
      kpi('negative', 'kpi.negative', negShare, formatPct(negShare), {
        delta: delta('negative_share', negShare, share(prior30, -1), 'pts'),
      }),
      kpi('pump_mentions', 'kpi.pump_mentions', pumpShare, formatPct(pumpShare), {
        delta: delta('negative_share', pumpShare, pumpBefore, 'pts'),
      }),
      kpi('replied', 'kpi.replied', replied, formatPct(replied), {
        note: t('note.target', { value: formatPct(ws.settings.target_reply_rate) }),
        tone: replied >= ws.settings.target_reply_rate ? 'good' : 'warn',
      }),
    ],
    aspects: aspects.slice(0, 6),
    issues: issues.slice(0, 4),
  };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const share = (list: Review[], s: -1 | 1) =>
  list.length ? list.filter((r) => r.aspects.some((x) => x.sentiment === s)).length / list.length : 0;

function topTexts(list: Review[], n: number): Review[] {
  const by = new Map<string, { r: Review; c: number }>();
  for (const r of list) {
    const e = by.get(r.text);
    if (e) e.c++;
    else by.set(r.text, { r, c: 1 });
  }
  return [...by.values()]
    .sort((a, b) => b.c - a.c || (a.r.text < b.r.text ? -1 : 1))
    .slice(0, n)
    .map((e) => e.r);
}

function dominantSku(list: Review[]): string {
  const by = new Map<string, number>();
  for (const r of list) by.set(r.sku, (by.get(r.sku) ?? 0) + 1);
  return [...by].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

/** First seen = where the current run starts: the change point that most raises the daily rate of mentions
 * (at least 7 days on each side), or the first mention when the rate never rose. */
function firstSeen(list: Review[], end: string): string {
  const dates = list
    .map((r) => r.review_date)
    .filter((d) => d <= end)
    .sort();
  if (!dates.length) return end;
  const start = dates[0]!;
  const span = daysBetween(start, end) + 1;
  let best = { ratio: 1.5, at: start };
  for (let i = 7; i <= span - 7; i++) {
    const split = addDays(start, i);
    const before = dates.filter((d) => d < split).length / i;
    const after = dates.filter((d) => d >= split).length / (span - i);
    const ratio = after / Math.max(before, 0.05);
    if (ratio > best.ratio) best = { ratio, at: split };
  }
  return dates.find((d) => d >= best.at) ?? best.at;
}

export { formatShortDate };
