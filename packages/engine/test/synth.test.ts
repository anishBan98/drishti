import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/models/random';
import { estimateSynth, projectSimplex, synthWeights } from '../src/models/synth';
import { addDays } from '../src/windows';

// Synthetic control (docs/08 §3.2): MOD-01 and MOD-02 (docs/12 §2).

const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

/** Donor cities as random walks with a shared weekly pattern; the treated city is a known mix plus an effect. */
function simulate(seed: number, opts: { noise: number; effect: number; donors?: number }) {
  const rand = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const D = opts.donors ?? 12;
  const pre = days('2026-01-01', 56);
  const post = days('2026-02-26', 21);
  const all = [...pre, ...post];
  const series = new Map<string, Map<string, number>>();
  const level = Array.from({ length: D }, () => 50_000 + rand() * 100_000);
  const paths = level.map((l) => {
    let x = l;
    return all.map((_, t) => {
      x *= 1 + 0.01 * gauss();
      return x * (1 + 0.15 * Math.sin((2 * Math.PI * t) / 7));
    });
  });
  paths.forEach((p, d) => series.set(`D${d}`, new Map(all.map((day, t) => [day, p[t]!]))));
  const mix = [0.5, 0.3, 0.2];
  const treated = all.map((_, t) => {
    const base = mix.reduce((a, w, d) => a + w * paths[d]![t]!, 0);
    const inPost = t >= pre.length;
    return base * (1 + opts.noise * gauss()) + (inPost ? opts.effect : 0);
  });
  series.set('T', new Map(all.map((day, t) => [day, treated[t]!])));
  return { series, pre, post, donors: Array.from({ length: D }, (_, d) => `D${d}`) };
}

describe('synthetic control', () => {
  it('MOD-01 weights are non-negative and sum to 1, for any input', () => {
    const rand = mulberry32(3);
    for (let k = 0; k < 200; k++) {
      const v = Array.from({ length: 1 + Math.floor(rand() * 12) }, () => (rand() - 0.5) * 20);
      const p = projectSimplex(v);
      expect(p.every((x) => x >= 0)).toBe(true);
      expect(p.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 9);
      const D = 2 + Math.floor(rand() * 6);
      const T = 10 + Math.floor(rand() * 30);
      const donors = Array.from({ length: D }, () => Array.from({ length: T }, () => rand() * 3));
      const w = synthWeights(
        Array.from({ length: T }, () => rand() * 3),
        donors,
        { iterations: 300 },
      );
      expect(w.every((x) => x >= 0)).toBe(true);
      expect(w.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 9);
    }
  });

  it('MOD-02 recovers a known effect within 10% with no noise', () => {
    const effect = -8_000;
    const s = simulate(1, { noise: 0, effect });
    const e = estimateSynth({
      series: s.series,
      treated: ['T'],
      donors: s.donors,
      pre: s.pre,
      post: s.post,
      smooth: 1,
    });
    const truth = effect * s.post.length;
    expect(Math.abs(e.effect - truth) / Math.abs(truth)).toBeLessThan(0.1);
    expect(e.r2).toBeGreaterThan(0.95);
  });

  it('MOD-02 the 90% range covers the true effect in at least 85 of 100 noisy simulations', () => {
    const effect = -8_000;
    let covered = 0;
    for (let seed = 100; seed < 200; seed++) {
      const s = simulate(seed, { noise: 0.03, effect });
      const e = estimateSynth({ series: s.series, treated: ['T'], donors: s.donors, pre: s.pre, post: s.post });
      const truth = effect * s.post.length;
      if (truth >= e.low && truth <= e.high) covered++;
    }
    expect(covered).toBeGreaterThanOrEqual(85);
  }, 60_000);
});
