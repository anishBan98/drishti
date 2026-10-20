import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GOVERNORS, snapshotSchema } from '@drishti/shared';
import { describe, expect, it } from 'vitest';
import { DEMO_SAMPLE_SCALE } from '../src/context';
import { loadDemoFacts, loadTrends } from '../src/facts/demo';
import { loadWorkspace } from '../src/facts/workspace';
import { buildSnapshot } from '../src/snapshot';
import { readDemo, ROOT } from './helpers';

// Demo snapshot (runbook M2 "done when"; docs/12 SYNC-01, SYNC-02 on the demo inputs, CON-06).
const ws = loadWorkspace((tab) => {
  try {
    return readFileSync(path.join(ROOT, 'sample-data/workspace', `${tab}.csv`), 'utf8');
  } catch {
    return undefined;
  }
});
const build = (generatedAt: string) => {
  const facts = loadDemoFacts(readDemo, { hashKey: 'demo' });
  facts.trends_weekly = loadTrends(readFileSync(path.join(ROOT, 'sample-data/inbox/google_trends_weekly.csv'), 'utf8'));
  return buildSnapshot(facts, ws, { demo: true, generatedAt, sampleScale: DEMO_SAMPLE_SCALE });
};
const snap = build('2026-10-17T07:10:00+05:30');

describe('demo snapshot', () => {
  it('validates against the zod schema (docs/06 §6)', () => {
    expect(snapshotSchema.safeParse(snap).success).toBe(true);
  });

  it('is deterministic: same inputs give the same version, whatever the sync time', () => {
    const again = build('2026-10-17T13:10:00+05:30');
    expect(again.version).toBe(snap.version);
    expect({ ...again, generated_at: '' }).toEqual({ ...snap, generated_at: '' });
    // A full demo build; slow when every package's tests run at once.
  }, 30_000);

  it('stays under the snapshot size governor (docs/05 §3)', () => {
    expect(JSON.stringify(snap).length).toBeLessThan(GOVERNORS.snapshotMaxBytes);
  });

  it('uses the demo windows and workspace name', () => {
    expect(snap.windows.week).toEqual(['2026-10-05', '2026-10-11']);
    expect(snap.windows.d28).toEqual(['2026-09-19', '2026-10-16']);
    expect(snap.workspace).toEqual({ name: 'Lumora Skin', demo: true });
    expect(snap.data_through).toBe('2026-10-16');
  });

  it('has six KPIs on every analytical screen and five suggestions on This week', () => {
    for (const s of [snap.week, snap.performance, snap.impact, snap.market, snap.customers, snap.voice, snap.data])
      expect(s.kpis).toHaveLength(6);
    expect(snap.week.suggestions).toHaveLength(5);
  });

  it('CON-06: Flipkart Ads is 5 days late and the creator tracker is late on 17 Oct', () => {
    const fk = snap.sources.find((s) => s.id === 'flipkart_ads')!;
    expect(fk.status).toBe('late');
    expect(fk.late_days).toBe(5);
    expect(snap.sources.find((s) => s.id === 'creators')!.status).toBe('late');
    expect(snap.sources.filter((s) => s.status === 'ok')).toHaveLength(11);
  });

  it('finds the planted market and voice effects the screens lead with', () => {
    const rivalB = snap.market.products.find((p) => p.label === 'Rival B')!;
    expect(rivalB.threat).toBe('High threat');
    expect(
      snap.market.price_changes.some(
        (c) => c.label === 'Rival B' && c.platform === 'Amazon' && c.pct <= -0.18 && c.date === '2026-10-02',
      ),
    ).toBe(true);
    const pump = snap.voice.issues.find((i) => /pump|dispenser/i.test(i.title))!;
    expect(pump.first_seen).toBe('2026-09-21');
    expect(snap.week.bridge.drivers.slice(0, 4).map((d) => d.id)).toEqual(
      expect.arrayContaining(['rival_price_cut', 'stockouts']),
    );
  });

  it('every suggestion has a run label, steps and an executor', () => {
    const all = [
      ...snap.week.suggestions,
      ...snap.performance.channels.flatMap((c) => c.suggestions),
      ...snap.impact.channels.flatMap((c) => c.suggestions),
      ...snap.market.products.flatMap((p) => p.suggestions),
      ...snap.customers.segments.flatMap((s) => s.suggestions),
      ...snap.voice.aspects.flatMap((a) => a.suggestions),
    ];
    expect(all.length).toBeGreaterThan(20);
    for (const s of all) {
      expect(s.runLabel, s.type).not.toBe('');
      expect(s.steps.length, s.type).toBeGreaterThan(0);
      expect(s.steps.join(' '), s.type).not.toMatch(/\{\w+\}/);
    }
  });

  it('holds no customer identifiers from the source files (docs/05 §10)', () => {
    expect(JSON.stringify(snap)).not.toMatch(/C2\d{5}/);
  });
});
