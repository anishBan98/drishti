import type { Media } from '@drishti/shared';
import type { Facts } from '../facts/types';
import type { PlannedTest } from '../facts/workspace';
import { addDays } from '../windows';
import { estimateSynth, type SynthEstimate } from './synth';

// Incrementality reads (docs/08 §3.2–3.3): planned geo tests and natural experiments, each read with synthetic
// control on daily total net revenue per city (all channels).

export const PRE_DAYS = 56;
export const MIN_PRE_DAYS = 28;
/** A donor city is dropped if any day in the window had at least this share of its quick-commerce stores out of stock. */
export const STOCKOUT_DAY_SHARE = 0.25;
/** A holdout counts only if spend in the test cities fell by at least this share of plan (TEST_NOT_APPLIED). */
export const MIN_APPLIED = 0.6;

export interface ExperimentRead {
  kind: 'test' | 'natural';
  id: string;
  media: Media;
  cities: string[];
  start: string;
  end: string;
  /** Real revenue per rupee and its 90% range. */
  roas: number;
  low: number;
  high: number;
  /** Rupees of spend removed (holdout, cut) or added (boost, burst). */
  spendChange: number;
  effect: number;
  rmspePct: number;
  r2: number;
  poorFit: boolean;
  donors: string[];
  method: SynthEstimate['method'];
}

const dayList = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

/** Daily total net revenue by city. */
export function citySeries(facts: Facts): Map<string, Map<string, number>> {
  const series = new Map<string, Map<string, number>>();
  for (const r of facts.sales_city_daily) {
    const m = series.get(r.city) ?? new Map<string, number>();
    m.set(r.date, (m.get(r.date) ?? 0) + r.net_revenue_inr);
    series.set(r.city, m);
  }
  return series;
}

/** Cities with a quick-commerce stockout event (≥ 25% of stores out on some day) between two dates. */
export function stockoutCities(facts: Facts, from: string, to: string): Set<string> {
  const day = new Map<string, { n: number; out: number }>();
  for (const r of facts.qc_store_daily) {
    if (r.date < from || r.date > to) continue;
    const k = `${r.date}|${r.city}`;
    const v = day.get(k) ?? { n: 0, out: 0 };
    v.n++;
    if (r.stockout) v.out++;
    day.set(k, v);
  }
  const out = new Set<string>();
  for (const [k, v] of day) if (v.n && v.out / v.n >= STOCKOUT_DAY_SHARE) out.add(k.split('|')[1]!);
  return out;
}

interface ReadInput {
  facts: Facts;
  series: Map<string, Map<string, number>>;
  media: Media;
  treated: string[];
  start: string;
  /** Last day of the change. */
  end: string;
  through: string;
  /** Cities that cannot be donors (other tests, other natural experiments). */
  exclude: Set<string>;
  /** Carry-over days read after the change ends (docs/08 §3.2 step 4). */
  tail?: number;
}

/** Synthetic-control read of one change in spend in some cities; null when there is not enough data to read it. */
export function readChange(input: ReadInput): Omit<ExperimentRead, 'kind' | 'id'> | null {
  const { facts, series, media, treated, start, through } = input;
  const end = input.end < through ? input.end : through;
  if (start > through) return null;
  const postEnd = (() => {
    const tailEnd = addDays(end, input.tail ?? 7);
    return tailEnd < through ? tailEnd : through;
  })();
  const first = [...series.values()].flatMap((m) => [...m.keys()]).reduce((a, d) => (d < a ? d : a), start);
  const preStart = addDays(start, -PRE_DAYS) > first ? addDays(start, -PRE_DAYS) : first;
  const pre = dayList(preStart, addDays(start, -1));
  if (pre.length < MIN_PRE_DAYS) return null;
  const post = dayList(start, postEnd);
  const stocked = stockoutCities(facts, pre[0]!, postEnd);
  const cities = [...series.keys()];
  const T = treated.filter((c) => series.has(c));
  if (!T.length) return null;
  const donors = cities.filter((c) => !T.includes(c) && !input.exclude.has(c) && !stocked.has(c)).sort();
  if (donors.length < 2) return null;

  const est = estimateSynth({ series, treated: T, donors, pre, post });

  // Spend change in the treated cities over the change window: actual minus expected (pre-period share × national).
  const window = dayList(start, end);
  let preAll = 0;
  let preT = 0;
  let nowAll = 0;
  let nowT = 0;
  const inPre = new Set(pre);
  const inWin = new Set(window);
  for (const r of facts.spend_city_daily) {
    if (r.media !== media) continue;
    if (inPre.has(r.date)) {
      preAll += r.spend_inr;
      if (T.includes(r.city)) preT += r.spend_inr;
    } else if (inWin.has(r.date)) {
      nowAll += r.spend_inr;
      if (T.includes(r.city)) nowT += r.spend_inr;
    }
  }
  const expected = preAll ? (preT / preAll) * nowAll : 0;
  const spendChange = nowT - expected;
  if (!spendChange) return null;
  // Return per rupee: the revenue gap divided by the spend change (both negative for a holdout or a cut).
  const roas = est.effect / spendChange;
  const a = est.low / spendChange;
  const b = est.high / spendChange;
  return {
    media,
    cities: T,
    start,
    end,
    roas,
    low: Math.min(a, b),
    high: Math.max(a, b),
    spendChange,
    effect: est.effect,
    rmspePct: est.rmspePct,
    r2: est.r2,
    poorFit: est.poorFit,
    donors,
    method: est.method,
  };
}

/** Reads every planned geo test that has started (docs/08 §3.2). Tests not applied (spend fell < 60% of plan) are skipped. */
export function readTests(facts: Facts, tests: PlannedTest[], through: string): ExperimentRead[] {
  const series = citySeries(facts);
  const out: ExperimentRead[] = [];
  for (const test of tests) {
    if (test.design !== 'geo_holdout' && test.design !== 'geo_boost') continue;
    const media = test.media as Media;
    // Cities in any other test that overlaps this one cannot be donors.
    const exclude = new Set(
      tests
        .filter(
          (o) =>
            o !== test &&
            o.start_date <= addDays(test.end_date, 7) &&
            o.end_date >= addDays(test.start_date, -PRE_DAYS),
        )
        .flatMap((o) => o.test_regions),
    );
    const r = readChange({
      facts,
      series,
      media,
      treated: test.test_regions,
      start: test.start_date,
      end: test.end_date,
      through,
      exclude,
    });
    if (!r) continue;
    // Guardrail (docs/08 §3.2 step 7): a holdout must actually have removed most of the planned spend.
    if (
      test.design === 'geo_holdout' &&
      applied(facts, media, r.cities, test.start_date, r.end, r.spendChange) < MIN_APPLIED
    )
      continue;
    out.push({ kind: 'test', id: test.test_id, ...r });
  }
  return out;
}

/** Share of the expected spend that was removed in the test cities (1 = all of it). */
function applied(facts: Facts, media: Media, cities: string[], from: string, to: string, change: number): number {
  const actual = facts.spend_city_daily
    .filter((r) => r.media === media && cities.includes(r.city) && r.date >= from && r.date <= to)
    .reduce((a, r) => a + r.spend_inr, 0);
  const expected = actual - change;
  return expected > 0 ? -change / expected : 0;
}
