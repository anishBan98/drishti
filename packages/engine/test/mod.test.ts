import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContext, DEMO_SAMPLE_SCALE } from '../src/context';
import { segmentCustomers } from '../src/models/segments';
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

describe('market and voice', () => {
  it('MOD-08 flags Rival B (−18%, 2 Oct), Rival F (−10%, 9 Oct) and Rival D (+5%, 11 Oct), not the 1-day flash deals', () => {
    const pc = snap.market.price_changes;
    const has = (label: string, date: string, pct: number) =>
      pc.some((c) => c.label === label && c.date === date && Math.abs(c.pct - pct) < 0.01);
    expect(has('Rival B', '2026-10-02', -0.182)).toBe(true);
    expect(has('Rival F', '2026-10-09', -0.1)).toBe(true);
    expect(has('Rival D', '2026-10-11', 0.05)).toBe(true);
    // One-day dips that came straight back: Rival F on 29 Sep and 12 Oct, Rival E on Flipkart on 30 Sep and 7 Oct.
    for (const [label, date] of [
      ['Rival F', '2026-09-29'],
      ['Rival F', '2026-10-12'],
      ['Rival E', '2026-09-30'],
      ['Rival E', '2026-10-07'],
    ])
      expect(pc.some((c) => c.label === label && c.date === date)).toBe(false);
  });

  it('VOICE-01 the pump is a growing issue first seen 21 Sep', () => {
    const pump = snap.voice.issues.find((i) => /pump|dispenser/i.test(i.title));
    expect(pump).toBeDefined();
    expect(pump!.first_seen).toBe('2026-09-21');
    expect(pump!.change_pct).toBeGreaterThan(0);
  });

  it('VOICE-01 "smaller than shown" is flagged as new on Flipkart (25 such reviews added to a copy of the demo data)', () => {
    // The sample reviews have no size complaint, so the test adds one to a copy (docs/12 VOICE-01).
    const extra = Array.from({ length: 25 }, (_, i) => ({
      review_id: `X${i}`,
      platform: 'Flipkart',
      sku: 'LUM-VC30',
      review_date: `2026-10-${String(1 + (i % 15)).padStart(2, '0')}`,
      rating: 2,
      text: 'The bottle is much smaller than shown in the photo.',
      verified_purchase: true,
      brand_replied: false,
      aspects: [],
    }));
    const copy = { ...facts, reviews: [...facts.reviews.map((r) => ({ ...r, aspects: [] })), ...extra] };
    const s = buildSnapshot(copy, ws, {
      demo: true,
      generatedAt: '2026-10-17T07:10:00+05:30',
      sampleScale: DEMO_SAMPLE_SCALE,
    });
    const size = s.voice.issues.find((i) => /smaller|size/i.test(i.title));
    expect(size, JSON.stringify(s.voice.issues.map((i) => i.title))).toBeDefined();
    expect(size!.is_new).toBe(true);
    expect(size!.platforms).toMatch(/Flipkart/);
  });

  it('MOD-07 the preferred type buys ≥ 2.5 times a year at ≥ ₹850; most of the problem type’s customers use discounts and pay COD (≥ 60%)', () => {
    const ctx = buildContext(facts, ws, { sampleScale: DEMO_SAMPLE_SCALE });
    const seg = segmentCustomers({
      orders: facts.orders_own_site,
      lines: facts.order_lines_own_site,
      customers: facts.customers_own_site,
      products: facts.products,
      calendar: ws.calendar,
      w: ctx.w,
      cacBySource: ctx.cacBySource,
    });
    const preferred = seg.segments.find((s) => s.kind === 'preferred')!;
    const problem = seg.segments.find((s) => s.kind === 'problem')!;
    expect(preferred.orders_per_year).toBeGreaterThanOrEqual(2.5);
    expect(preferred.aov).toBeGreaterThanOrEqual(850);
    expect(problem.discount_customers_pct).toBeGreaterThanOrEqual(0.6);
    expect(problem.cod_customers_pct).toBeGreaterThanOrEqual(0.6);
    expect(problem.name).toBe('COD Returners');
  });
});
