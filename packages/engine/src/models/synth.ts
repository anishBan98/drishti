import { mulberry32, quantile } from './random';

// Synthetic control (docs/08 §3.2): weights on donor cities that best reproduce the treated series before a change,
// then the gap after it. Deterministic: fixed start, fixed iterations, seeded bootstrap.

/** Euclidean projection onto the probability simplex {w ≥ 0, Σw = 1} (Duchi et al. 2008). */
export function projectSimplex(v: number[]): number[] {
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let theta = 0;
  for (let i = 0; i < u.length; i++) {
    css += u[i]!;
    const t = (css - 1) / (i + 1);
    if (u[i]! - t > 0) theta = t;
  }
  return v.map((x) => Math.max(0, x - theta));
}

/**
 * Weights w on the simplex minimising Σ_t (y_t − Σ_d w_d Y_dt)² + λ‖w‖², by accelerated projected gradient
 * (FISTA) on the Gram matrix, so each step costs O(D²). `donors[d][t]` is donor d at pre-period day t.
 * Deterministic start w = 1/D; at most 2,000 iterations, stopping when a step moves the weights by under 1e-9.
 */
export function synthWeights(
  y: number[],
  donors: number[][],
  opts: { lambda?: number; iterations?: number } = {},
): number[] {
  const D = donors.length;
  if (!D) return [];
  const T = y.length;
  const lambda = opts.lambda ?? 0.01 * (y.reduce((a, v) => a + v * v, 0) / Math.max(1, T));
  // G = Y Yᵀ + λI and b = Y y; the gradient is 2(Gw − b).
  const G = donors.map((ri, i) =>
    donors.map((rj, j) => {
      let s = i === j ? lambda : 0;
      for (let t = 0; t < T; t++) s += ri[t]! * rj[t]!;
      return s;
    }),
  );
  const b = donors.map((r) => r.reduce((a, v, t) => a + v * y[t]!, 0));
  // Lipschitz constant 2·λmax(G), by power iteration.
  let v = Array.from({ length: D }, () => 1 / Math.sqrt(D));
  let lmax = 1;
  for (let k = 0; k < 100; k++) {
    const Gv = G.map((row) => row.reduce((a, g, j) => a + g * v[j]!, 0));
    lmax = Math.hypot(...Gv) || 1;
    v = Gv.map((x) => x / lmax);
  }
  const step = 1 / (2 * lmax);
  let w = Array.from({ length: D }, () => 1 / D);
  let z = [...w];
  let tk = 1;
  for (let it = 0; it < (opts.iterations ?? 2000); it++) {
    const grad = G.map((row, i) => 2 * (row.reduce((a, g, j) => a + g * z[j]!, 0) - b[i]!));
    const next = projectSimplex(z.map((x, i) => x - step * grad[i]!));
    const tNext = (1 + Math.sqrt(1 + 4 * tk * tk)) / 2;
    z = next.map((x, i) => x + ((tk - 1) / tNext) * (x - w[i]!));
    let moved = 0;
    for (let i = 0; i < D; i++) moved += Math.abs(next[i]! - w[i]!);
    w = next;
    tk = tNext;
    if (moved < 1e-9) break;
  }
  return w;
}

/** Pre-period fit check (docs/08 §3.2 step 3): RMSPE on 7-day sums at most 8% of the treated level. */
export const MAX_RMSPE = 0.08;

export interface SynthInput {
  /** city → date → value (daily net revenue). */
  series: Map<string, Map<string, number>>;
  treated: string[];
  donors: string[];
  /** Pre-period dates (oldest first) and effect dates (change start through readout, plus any carry-over tail). */
  pre: string[];
  post: string[];
  /**
   * Fit weights and R² on k-day rolling sums (default 7): day-to-day noise that cities do not share is smoothed out,
   * while trend and seasonality remain. Gaps and the effect are still daily, in rupees.
   */
  smooth?: number;
}

export interface SynthFit {
  weights: Record<string, number>;
  r2: number;
  /** Pre-period root mean squared prediction error on the smoothed series, as a share of its mean. */
  rmspePct: number;
  /** Σ over post dates of actual − synthetic, in rupees. */
  effect: number;
  /** Daily gaps (rupees) over the post dates. */
  gaps: number[];
  /** Pre-period residuals (rupees), for the bootstrap. */
  residuals: number[];
}

const sumAt = (series: SynthInput['series'], cities: string[], d: string) =>
  cities.reduce((a, c) => a + (series.get(c)?.get(d) ?? 0), 0);

/** Fits one synthetic control on series normalised by their pre-period means, then reports gaps in rupees. */
export function fitSynth(input: SynthInput): SynthFit {
  const { series, treated, donors, pre, post } = input;
  const yPre = pre.map((d) => sumAt(series, treated, d));
  const yPost = post.map((d) => sumAt(series, treated, d));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const scaleT = mean(yPre) || 1;
  const donorPre = donors.map((c) => pre.map((d) => series.get(c)?.get(d) ?? 0));
  const donorScale = donorPre.map((r) => mean(r) || 1);
  const k = Math.max(1, input.smooth ?? 7);
  const roll = (a: number[]) => a.slice(k - 1).map((_, i) => a.slice(i, i + k).reduce((s, v) => s + v, 0) / k);
  const Y = donorPre.map((r, i) => roll(r.map((v) => v / donorScale[i]!)));
  const yFit = roll(yPre.map((v) => v / scaleT));
  const w = synthWeights(yFit, Y);
  const synth = (dates: string[]) =>
    dates.map(
      (d) => scaleT * donors.reduce((a, c, i) => a + w[i]! * ((series.get(c)?.get(d) ?? 0) / donorScale[i]!), 0),
    );
  const fitPre = synth(pre);
  const fitPost = synth(post);
  const residuals = yPre.map((v, t) => v - fitPre[t]!);
  // Fit check on the smoothed series (docs/08 §3.2 step 3).
  const yS = roll(yPre);
  const fS = roll(fitPre);
  const ssRes = yS.reduce((a, v, t) => a + (v - fS[t]!) ** 2, 0);
  const m = mean(yS);
  const ssTot = yS.reduce((a, v) => a + (v - m) ** 2, 0) || 1;
  const rmspePct = m ? Math.sqrt(ssRes / Math.max(1, yS.length)) / m : 0;
  const gaps = yPost.map((v, t) => v - fitPost[t]!);
  return {
    weights: Object.fromEntries(donors.map((c, i) => [c, w[i]!])),
    r2: 1 - ssRes / ssTot,
    rmspePct,
    effect: gaps.reduce((a, g) => a + g, 0),
    gaps,
    residuals,
  };
}

export interface SynthEstimate extends SynthFit {
  /** 90% range of the effect (rupees). */
  low: number;
  high: number;
  method: 'placebo' | 'bootstrap';
  poorFit: boolean;
}

/**
 * Effect with a 90% range (docs/08 §3.2 step 6): placebo-in-space with ≥ 6 donors (each donor treated as if it had
 * changed, scaled to the treated size), else a block bootstrap over weeks of pre-period residuals (seeded).
 */
export function estimateSynth(input: SynthInput, opts: { seed?: number; resamples?: number } = {}): SynthEstimate {
  const fit = fitSynth(input);
  const scale = (cities: string[]) =>
    input.pre.reduce((a, d) => a + sumAt(input.series, cities, d), 0) / Math.max(1, input.pre.length);
  let noise: number[];
  let method: SynthEstimate['method'];
  if (input.donors.length >= 6) {
    method = 'placebo';
    const sT = scale(input.treated);
    noise = input.donors.map((d) => {
      const p = fitSynth({ ...input, treated: [d], donors: input.donors.filter((x) => x !== d) });
      return p.effect * (sT / (scale([d]) || 1));
    });
  } else {
    method = 'bootstrap';
    const rand = mulberry32(opts.seed ?? 11);
    const weeks: number[][] = [];
    for (let i = 0; i < fit.residuals.length; i += 7) weeks.push(fit.residuals.slice(i, i + 7));
    const n = input.post.length;
    noise = Array.from({ length: opts.resamples ?? 400 }, () => {
      let s = 0;
      let k = 0;
      while (k < n) {
        const wk = weeks[Math.floor(rand() * weeks.length)] ?? [0];
        for (const r of wk) {
          if (k++ >= n) break;
          s += r;
        }
      }
      return s;
    });
  }
  const sorted = noise.sort((a, b) => a - b);
  // The range is the estimate plus the spread of effects seen where nothing changed.
  return {
    ...fit,
    low: fit.effect + quantile(sorted, 0.05) - quantile(sorted, 0.5),
    high: fit.effect + quantile(sorted, 0.95) - quantile(sorted, 0.5),
    method,
    poorFit: fit.rmspePct > MAX_RMSPE,
  };
}
