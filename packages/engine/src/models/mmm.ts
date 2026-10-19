import { MEDIA, type Media } from '@drishti/shared';
import type { SalesCityDaily, SpendCityDaily } from '../facts/types';
import { addDays, daysBetween } from '../windows';
import { mulberry32, quantile } from './random';

// MMM-lite, v1 (docs/08-METHODS.md §3.4, simplified for M2): city × week revenue regressed on adstocked spend
// per medium with city fixed effects and a shared week effect, non-negative ridge least squares.
// Not yet: saturation, experiment calibration, natural experiments and synthetic control (milestone M6).

export interface MmmResult {
  /** Real revenue per rupee by medium, with a 90% range from a block bootstrap over weeks. */
  beta: Record<Media, { est: number; low: number; high: number }>;
  weeks: number;
  method: string;
}

const THETA = 0.3; // adstock carryover per week (fixed in v1)
const RIDGE = 0.05;

/** Non-negative ridge least squares by coordinate descent: min ‖y − Xb‖² + λ‖b‖², b ≥ 0. */
export function nnls(X: number[][], y: number[], lambda = 0, iterations = 500): number[] {
  const p = X[0]?.length ?? 0;
  const b = new Array<number>(p).fill(0);
  const colSq = Array.from({ length: p }, (_, j) => X.reduce((a, row) => a + row[j]! * row[j]!, 0));
  const resid = [...y];
  for (let it = 0; it < iterations; it++) {
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      if (colSq[j] === 0) continue;
      let dot = 0;
      for (let i = 0; i < X.length; i++) dot += X[i]![j]! * resid[i]!;
      const next = Math.max(0, (dot + colSq[j]! * b[j]!) / (colSq[j]! + lambda));
      const step = next - b[j]!;
      if (step !== 0) {
        for (let i = 0; i < X.length; i++) resid[i]! -= step * X[i]![j]!;
        b[j] = next;
        maxStep = Math.max(maxStep, Math.abs(step));
      }
    }
    if (maxStep < 1e-9) break;
  }
  return b;
}

export function fitMmm(sales: SalesCityDaily[], spend: SpendCityDaily[], through: string, days = 365): MmmResult {
  const start = addDays(through, -(days - 1));
  const weekOf = (d: string) => Math.floor(daysBetween(start, d) / 7);
  const nWeeks = Math.floor(days / 7);
  const cities = [...new Set(sales.map((r) => r.city))].sort();
  const cityIdx = new Map(cities.map((c, i) => [c, i]));
  const rev = cities.map(() => new Array<number>(nWeeks).fill(0));
  const sp = MEDIA.map(() => cities.map(() => new Array<number>(nWeeks).fill(0)));
  for (const r of sales) {
    const w = weekOf(r.date);
    if (w >= 0 && w < nWeeks) rev[cityIdx.get(r.city)!]![w]! += r.net_revenue_inr;
  }
  for (const r of spend) {
    const w = weekOf(r.date);
    const c = cityIdx.get(r.city);
    if (w >= 0 && w < nWeeks && c !== undefined) sp[MEDIA.indexOf(r.media)]![c]![w]! += r.spend_inr;
  }
  // Adstock, then remove city and week means (two-way fixed effects) from revenue and every regressor.
  const ad = sp.map((byCity) =>
    byCity.map((series) => {
      const out: number[] = [];
      series.forEach((x, t) => out.push((1 - THETA) * x + THETA * (t ? out[t - 1]! : x)));
      return out;
    }),
  );
  const demean = (m: number[][]) => {
    const grand = m.flat().reduce((a, b) => a + b, 0) / (cities.length * nWeeks);
    const rowMean = m.map((r) => r.reduce((a, b) => a + b, 0) / nWeeks);
    const colMean = Array.from({ length: nWeeks }, (_, w) => m.reduce((a, r) => a + r[w]!, 0) / cities.length);
    return m.map((r, c) => r.map((v, w) => v - rowMean[c]! - colMean[w]! + grand));
  };
  // Put every city on the same scale (divide by its mean weekly revenue) so city size does not drive the fit.
  const size = rev.map((r) => r.reduce((a, b) => a + b, 0) / nWeeks || 1);
  const perSize = (m: number[][]) => m.map((r, c) => r.map((v) => v / size[c]!));
  const y = demean(perSize(rev));
  const xs = ad.map((m) => demean(perSize(m)));
  const rows = (weeks: number[]) => {
    const X: number[][] = [];
    const Y: number[] = [];
    for (const w of weeks)
      for (let c = 0; c < cities.length; c++) {
        X.push(xs.map((m) => m[c]![w]!));
        Y.push(y[c]![w]!);
      }
    return { X, Y };
  };
  // Scale columns so the ridge penalty treats media alike.
  const all = rows(Array.from({ length: nWeeks }, (_, w) => w));
  const scale = MEDIA.map((_, j) => Math.sqrt(all.X.reduce((a, r) => a + r[j]! * r[j]!, 0) / all.X.length) || 1);
  const solve = (X: number[][], Y: number[]) => {
    const Xs = X.map((r) => r.map((v, j) => v / scale[j]!));
    const lambda = RIDGE * Xs.length;
    return nnls(Xs, Y, lambda).map((b, j) => b / scale[j]!);
  };
  const est = solve(all.X, all.Y);
  // Block bootstrap over weeks (deterministic seed), 60 resamples.
  const rand = mulberry32(7);
  const draws: number[][] = MEDIA.map(() => []);
  for (let s = 0; s < 60; s++) {
    const weeks = Array.from({ length: nWeeks }, () => Math.floor(rand() * nWeeks));
    const b = rows(weeks);
    solve(b.X, b.Y).forEach((v, j) => draws[j]!.push(v));
  }
  const beta = Object.fromEntries(
    MEDIA.map((m, j) => {
      const sorted = draws[j]!.sort((a, b) => a - b);
      return [
        m,
        {
          est: est[j]!,
          low: Math.min(est[j]!, quantile(sorted, 0.05)),
          high: Math.max(est[j]!, quantile(sorted, 0.95)),
        },
      ];
    }),
  ) as MmmResult['beta'];
  return { beta, weeks: nWeeks, method: 'mmm_lite_v1' };
}
