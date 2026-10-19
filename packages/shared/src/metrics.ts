import type { Delta } from './snapshot';

// Good or bad direction per metric (docs/08-METHODS.md §1).
export const UP_IS_GOOD = new Set([
  'revenue',
  'orders',
  'units',
  'aov',
  'buyers',
  'roas',
  'true_roas',
  'ltv_cac',
  'rating',
  'share',
  'repeat',
  'search_share',
  'reply_rate',
]);
export const UP_IS_BAD = new Set([
  'cac',
  'return_rate',
  'rto',
  'stockouts',
  'negative_share',
  'discount_share',
  'late_sources',
]);

/** Change of a value (pct) or of a rate (pts), its direction and whether that is good for this metric. */
export function delta(metric: string, current: number, prior: number, unit: 'pct' | 'pts' | 'x' = 'pct'): Delta {
  const value = unit === 'pct' ? (prior === 0 ? 0 : (current - prior) / prior) : current - prior;
  const flat =
    unit === 'pct' ? Math.abs(value) < 0.005 : unit === 'x' ? Math.abs(value) < 0.05 : Math.abs(value) < 0.002;
  const direction = flat ? 'flat' : value > 0 ? 'up' : 'down';
  const good = flat ? null : UP_IS_GOOD.has(metric) ? value > 0 : UP_IS_BAD.has(metric) ? value < 0 : null;
  return { value: round(value, 4), unit, direction, good };
}

export function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
