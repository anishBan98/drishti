import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDemoFacts } from '../src/facts/demo';
import { loadWorkspace } from '../src/facts/workspace';
import { readTests, stockoutCities } from '../src/models/incrementality';

// MOD-03 (docs/12 §2): the Meta holdout in Pune and Ahmedabad, read with synthetic control on the demo data.

const root = path.resolve(import.meta.dirname, '../../../sample-data');
const facts = loadDemoFacts((n) => readFileSync(path.join(root, 'demo', n), 'utf8'), { hashKey: 'demo' });
const ws = loadWorkspace((tab) => {
  try {
    return readFileSync(path.join(root, 'workspace', `${tab}.csv`), 'utf8');
  } catch {
    return undefined;
  }
});

describe('planned tests', () => {
  const reads = readTests(facts, ws.tests, '2026-10-16');
  const meta = reads.find((r) => r.id === 'T-01');

  it('drops donors with a stockout event and cities in the other live test', () => {
    expect(stockoutCities(facts, '2026-09-26', '2026-10-16')).toEqual(new Set(['Mumbai']));
    expect(meta).toBeDefined();
    expect(meta!.donors).not.toContain('Mumbai');
    for (const c of ['Jaipur', 'Lucknow', 'Indore', 'Kochi', 'Pune', 'Ahmedabad'])
      expect(meta!.donors).not.toContain(c);
  });

  it('MOD-03 Meta holdout: estimate in [0.6, 2.4], range contains it, pre-period fit RMSPE ≤ 8%', () => {
    expect(meta!.roas).toBeGreaterThanOrEqual(0.6);
    expect(meta!.roas).toBeLessThanOrEqual(2.4);
    expect(meta!.low).toBeLessThanOrEqual(meta!.roas);
    expect(meta!.high).toBeGreaterThanOrEqual(meta!.roas);
    expect(meta!.rmspePct).toBeLessThanOrEqual(0.08);
    expect(meta!.poorFit).toBe(false);
  });
});
