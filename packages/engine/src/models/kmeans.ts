import { mulberry32 } from './random';

// k-means (docs/08-METHODS.md §7.2): k-means++ initialisation with mulberry32(seed), restarts, max iterations,
// tolerance; keeps the lowest inertia. Deterministic for a given seed.

export interface KmeansResult {
  labels: number[];
  centroids: number[][];
  inertia: number;
}

const dist2 = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
  return s;
};

export function kmeans(
  points: number[][],
  k: number,
  opts: { seed?: number; restarts?: number; maxIter?: number; tol?: number } = {},
): KmeansResult {
  const { seed = 7, restarts = 10, maxIter = 300, tol = 1e-6 } = opts;
  const rand = mulberry32(seed);
  const dim = points[0]?.length ?? 0;
  let best: KmeansResult | undefined;

  for (let r = 0; r < restarts; r++) {
    // k-means++ seeding
    const centroids: number[][] = [points[Math.floor(rand() * points.length)]!.slice()];
    const d = points.map((p) => dist2(p, centroids[0]!));
    while (centroids.length < k) {
      const total = d.reduce((a, b) => a + b, 0);
      let target = rand() * total;
      let idx = 0;
      for (; idx < d.length - 1; idx++) {
        target -= d[idx]!;
        if (target <= 0) break;
      }
      const c = points[idx]!.slice();
      centroids.push(c);
      for (let i = 0; i < points.length; i++) d[i] = Math.min(d[i]!, dist2(points[i]!, c));
    }

    const labels = new Array<number>(points.length).fill(0);
    let inertia = Infinity;
    for (let it = 0; it < maxIter; it++) {
      let next = 0;
      for (let i = 0; i < points.length; i++) {
        let bi = 0;
        let bd = Infinity;
        for (let j = 0; j < k; j++) {
          const dd = dist2(points[i]!, centroids[j]!);
          if (dd < bd) {
            bd = dd;
            bi = j;
          }
        }
        labels[i] = bi;
        next += bd;
      }
      const sums = Array.from({ length: k }, () => new Array<number>(dim).fill(0));
      const counts = new Array<number>(k).fill(0);
      points.forEach((p, i) => {
        counts[labels[i]!]!++;
        p.forEach((v, j) => (sums[labels[i]!]![j]! += v));
      });
      for (let j = 0; j < k; j++) if (counts[j]) centroids[j] = sums[j]!.map((s) => s / counts[j]!);
      const done = inertia - next <= tol * Math.max(1, next);
      inertia = next;
      if (done) break;
    }
    if (!best || inertia < best.inertia)
      best = { labels: labels.slice(), centroids: centroids.map((c) => c.slice()), inertia };
  }
  return best!;
}

/** Mean silhouette on (at most) the first n points. */
export function silhouette(points: number[][], labels: number[], k: number, n = 2000): number {
  const idx = points.map((_, i) => i).slice(0, n);
  let total = 0;
  for (const i of idx) {
    const sums = new Array<number>(k).fill(0);
    const counts = new Array<number>(k).fill(0);
    for (const j of idx) {
      if (i === j) continue;
      sums[labels[j]!]! += Math.sqrt(dist2(points[i]!, points[j]!));
      counts[labels[j]!]!++;
    }
    const own = labels[i]!;
    const a = counts[own] ? sums[own]! / counts[own]! : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own && counts[c]) b = Math.min(b, sums[c]! / counts[c]!);
    total += b === Infinity || Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
  }
  return idx.length ? total / idx.length : 0;
}
