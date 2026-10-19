import { describe, expect, it } from 'vitest';
import {
  formatInr,
  formatMonthYear,
  formatPct,
  formatPoints,
  formatRange,
  formatRoas,
  formatShortDate,
  groupIndian,
  joinList,
} from '../src/format';
import { delta } from '../src/metrics';

// Formatting rules (docs/09 §9, docs/08 §1).
describe('money', () => {
  it.each([
    [12400, '₹12,400'],
    [99999, '₹99,999'],
    [460000, '₹4.6 L'],
    [2900000, '₹29 L'],
    [43000000, '₹4.30 Cr'],
    [184000000, '₹18.4 Cr'],
    [-2900000, '−₹29 L'],
  ])('%d → %s', (v, s) => expect(formatInr(v, { compact: true })).toBe(s));

  it('groups digits the Indian way', () => {
    expect(groupIndian(1234567)).toBe('12,34,567');
    expect(formatInr(1234567)).toBe('₹12,34,567');
  });
});

describe('numbers, rates and dates', () => {
  it('percentages: one decimal under 10, whole numbers above', () => {
    expect(formatPct(0.065)).toBe('6.5%');
    expect(formatPct(0.21)).toBe('21%');
    expect(formatPct(-0.044, { signed: true })).toBe('−4.4%');
    expect(formatPct(0.02, { signed: true })).toBe('+2%');
  });
  it('points, ROAS and dates', () => {
    expect(formatPoints(0.012)).toBe('1.2 points');
    expect(formatPoints(0.01)).toBe('1 point');
    expect(formatRoas(2)).toBe('2.0x');
    expect(formatRoas(null)).toBe('—');
    expect(formatShortDate('2026-10-17')).toBe('17 Oct');
    expect(formatRange(['2026-10-05', '2026-10-11'])).toBe('5 to 11 October 2026');
    expect(formatRange(['2026-09-28', '2026-10-04'])).toBe('28 September to 4 October 2026');
    expect(formatMonthYear('2025-04-01')).toBe('Apr 2025');
    expect(joinList(['Jaipur', 'Lucknow', 'Kochi'])).toBe('Jaipur, Lucknow and Kochi');
  });
});

describe('good or bad (docs/08 §1)', () => {
  it('up is good for revenue and bad for CAC; small changes are flat', () => {
    expect(delta('revenue', 106, 100)).toMatchObject({ direction: 'up', good: true });
    expect(delta('cac', 106, 100)).toMatchObject({ direction: 'up', good: false });
    expect(delta('revenue', 100.4, 100)).toMatchObject({ direction: 'flat', good: null });
    expect(delta('return_rate', 0.051, 0.05, 'pts')).toMatchObject({ direction: 'flat' });
    expect(delta('true_roas', 1.9, 2.1, 'x')).toMatchObject({ direction: 'down', good: false });
  });
});
