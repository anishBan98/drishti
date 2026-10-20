import { describe, expect, it } from 'vitest';
import { AI_DAILY_NEURONS, estimateNeurons, numbersIn, onlyKnownNumbers } from '../src/ai';

// AI governance (docs/08 §11): numbers come from code only; the daily budget stays under the free allocation.

describe('AI rules', () => {
  it('reads numbers with Indian grouping and decimals', () => {
    expect(numbersIn('Revenue fell 4.4% to ₹4,14,00,000 in week 42')).toEqual(['4.4', '41400000', '42']);
  });

  it('accepts a draft that only reuses numbers from the facts and rejects an invented one', () => {
    const facts = '- 142 reviews mention the pump\n- Rating fell from 4.3 to 3.9';
    expect(onlyKnownNumbers('About 142 reviews say the pump fails; the rating slid to 3.9.', facts)).toBe(true);
    expect(onlyKnownNumbers('Nearly 200 reviews complain about the pump.', facts)).toBe(false);
  });

  it('estimates a draft call well inside the daily budget', () => {
    const n = estimateNeurons('large', 2000, 220);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(AI_DAILY_NEURONS / 50);
  });
});
