import type { Media } from '@drishti/shared';
import type { ExperimentRead } from './incrementality';

// Evidence hierarchy (docs/08 §3.1): planned tests, natural experiments and the media-mix regression, combined by
// precision (weight ÷ variance). A weak prior from the measured media's real-to-claimed ratio covers media that no
// experiment has reached yet.

export interface Estimate {
  source: 'test' | 'natural' | 'mmm' | 'prior';
  est: number;
  low: number;
  high: number;
  weight: number;
}

export interface Combined {
  roas: number;
  low: number;
  high: number;
  confidence: 'high' | 'medium' | 'low';
  sources: Estimate['source'][];
  tests: number;
  naturals: number;
}

const Z90 = 1.645;
const sdOf = (e: Pick<Estimate, 'low' | 'high'>) => Math.max(1e-3, (e.high - e.low) / (2 * Z90));

/** Weight for an experiment by age: 1.0 (tests) or 0.6 (natural) within 120 days, falling linearly to 0.3 at 365 days. */
export function experimentWeight(kind: ExperimentRead['kind'], endedDaysAgo: number): number {
  const base = kind === 'test' ? 1 : 0.6;
  if (endedDaysAgo <= 120) return base;
  if (endedDaysAgo >= 365) return 0.3 * base;
  return base * (1 - (0.7 * (endedDaysAgo - 120)) / 245);
}

export function combine(estimates: Estimate[], opts: { recentTest: boolean }): Combined | null {
  const usable = estimates.filter((e) => Number.isFinite(e.est) && e.weight > 0);
  if (!usable.length) return null;
  const p = usable.map((e) => e.weight / sdOf(e) ** 2);
  const P = p.reduce((a, b) => a + b, 0);
  const roas = usable.reduce((a, e, i) => a + p[i]! * e.est, 0) / P;
  const sd = Math.sqrt(1 / P);
  const low = Math.max(0, roas - Z90 * sd);
  const high = roas + Z90 * sd;
  const width = high - low;
  const tests = usable.filter((e) => e.source === 'test').length;
  const naturals = usable.filter((e) => e.source === 'natural').length;
  const confidence: Combined['confidence'] =
    opts.recentTest && width < 0.6 * roas ? 'high' : tests || naturals || width < roas ? 'medium' : 'low';
  return { roas, low, high, confidence, sources: [...new Set(usable.map((e) => e.source))], tests, naturals };
}

/**
 * The weak prior for a platform medium: its claim times the median real-to-claimed ratio of media with experiment
 * evidence (platforms count sales they did not cause; experiments measure by how much). Not used for creators,
 * whose platforms cannot see most sales they drive.
 */
export function claimPrior(claimed: number, measuredRatios: number[]): Pick<Estimate, 'est' | 'low' | 'high'> | null {
  if (!measuredRatios.length || !claimed) return null;
  const s = [...measuredRatios].sort((a, b) => a - b);
  const m = s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
  const est = claimed * m;
  // Broad: ±60% of the value at 90%.
  return { est, low: est * 0.4, high: est * 1.6 };
}

export const PRIOR_WEIGHT = 0.2;
export const MMM_WEIGHT = 0.4;
export type { Media };
