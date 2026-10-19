import { describe, expect, it } from 'vitest';
import { kmeans } from '../src/models/kmeans';
import { nnls } from '../src/models/mmm';
import { mulberry32 } from '../src/models/random';
import { tagReview } from '../src/voice/lexicon';
import { addDays, windowsFor } from '../src/windows';

describe('k-means (docs/08 §7.2)', () => {
  const rand = mulberry32(1);
  const pts = Array.from({ length: 300 }, (_, i) => [
    ((i % 3) * 10 + rand()) as number,
    ((i % 3) * -5 + rand()) as number,
  ]);
  it('is deterministic for a seed and separates clear groups', () => {
    const a = kmeans(pts, 3, { seed: 7 });
    const b = kmeans(pts, 3, { seed: 7 });
    expect(a.labels).toEqual(b.labels);
    expect(new Set(a.labels.filter((_, i) => i % 3 === 0)).size).toBe(1);
  });
});

describe('non-negative least squares', () => {
  it('recovers a non-negative solution and clamps a negative one to zero', () => {
    const X = Array.from({ length: 50 }, (_, i) => [i, (i * 7) % 11]);
    const y = X.map(([a, b]) => 2 * a! - 0.5 * b!);
    const b = nnls(X, y);
    expect(b[0]).toBeGreaterThan(1.5);
    expect(b[1]).toBe(0);
  });
});

describe('lexicon tagging (docs/08 §8.2)', () => {
  it('tags the pump and its sentiment, with negation', () => {
    expect(tagReview({ text: 'Pump stopped working after a week, had to pour it out.', rating: 2 })).toContainEqual({
      aspect: 'pump_packaging',
      sentiment: -1,
      source: 'lexicon',
    });
    expect(tagReview({ text: 'Absorbs in seconds, not sticky under makeup.', rating: 5 })).toContainEqual({
      aspect: 'texture',
      sentiment: 1,
      source: 'lexicon',
    });
  });
});

describe('windows (docs/08 §1)', () => {
  it('this week is the last complete Monday–Sunday week before today', () => {
    const w = windowsFor('2026-10-19'); // a Monday
    expect(w.week).toEqual(['2026-10-12', '2026-10-18']);
    expect(windowsFor('2026-10-18').week).toEqual(['2026-10-05', '2026-10-11']);
    expect(windowsFor('2027-01-02').d28).toEqual(['2026-12-05', '2027-01-01']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
