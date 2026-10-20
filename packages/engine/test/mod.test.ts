import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_SAMPLE_SCALE } from '../src/context';
import { loadDemoFacts, loadTrends } from '../src/facts/demo';
import { loadWorkspace } from '../src/facts/workspace';
import { buildSnapshot } from '../src/snapshot';
import { readDemo, ROOT } from './helpers';

// Model checks on the full demo snapshot (docs/12 §2): MOD-05, MOD-06, MOD-07, MOD-08 and VOICE-01.

const ws = loadWorkspace((tab) => {
  try {
    return readFileSync(path.join(ROOT, 'sample-data/workspace', `${tab}.csv`), 'utf8');
  } catch {
    return undefined;
  }
});
const facts = loadDemoFacts(readDemo, { hashKey: 'demo' });
facts.trends_weekly = loadTrends(readFileSync(path.join(ROOT, 'sample-data/inbox/google_trends_weekly.csv'), 'utf8'));
const snap = buildSnapshot(facts, ws, {
  demo: true,
  generatedAt: '2026-10-17T07:10:00+05:30',
  sampleScale: DEMO_SAMPLE_SCALE,
});

describe('measurement', () => {
  it('MOD-05 every medium’s real return is below its platform claim, except creators (above)', () => {
    for (const c of snap.impact.channels) {
      if (c.id === 'creators') expect(c.real_per100, c.id).toBeGreaterThan(c.claimed_per100);
      else expect(c.real_per100, c.id).toBeLessThan(c.claimed_per100);
    }
  });

  it('Meta rests on the live holdout and natural experiments, with high confidence', () => {
    const meta = snap.impact.channels.find((c) => c.id === 'meta')!;
    expect(meta.evidence).toMatch(/holdout in Pune and Ahmedabad/);
    expect(meta.confidence).toBe('high');
    expect(meta.real_per100).toBeGreaterThan(110);
    expect(meta.real_per100).toBeLessThan(200);
  });

  it('MOD-06 the bridge explains at least 80% of the week; Rival B and Mumbai stockouts are negative and in the top four', () => {
    const b = snap.week.bridge;
    expect(b.explained_pct).toBeGreaterThanOrEqual(0.8);
    const top4 = [...b.drivers].sort((x, y) => Math.abs(y.value_lakh) - Math.abs(x.value_lakh)).slice(0, 4);
    for (const label of [/Rival B/, /Mumbai stockouts/]) {
      const d = top4.find((x) => label.test(x.label));
      expect(d, String(label)).toBeDefined();
      expect(d!.value_lakh).toBeLessThan(0);
    }
  });
});
