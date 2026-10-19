import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvObjects, parseDate, parseInr, parseNumber } from '../src/csv';

describe('CSV reading', () => {
  it('handles quotes, escaped quotes, CRLF, a BOM and blank lines', () => {
    const text = '﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['1', '2'],
    ]);
  });

  it('maps rows to header keys and fills missing cells', () => {
    expect(parseCsvObjects('a,b,c\n1,2\n').rows).toEqual([{ a: '1', b: '2', c: '' }]);
  });
});

describe('CON-16 number and date formats', () => {
  it.each([
    ['₹1,23,456', 123456],
    ['1,234.50', 1234.5],
    ['12%', 0.12],
    ['(500)', -500],
    ['−42', -42],
    ['Rs. 999', 999],
    ['INR 4,500', 4500],
    ['1.2e3', 1200],
  ])('parses %s', (raw, value) => expect(parseNumber(raw)).toBeCloseTo(value, 6));

  it.each(['', '-', '—', 'n/a', 'abc'])('returns null for %j', (raw) => expect(parseNumber(raw)).toBeNull());

  it('rounds money to whole rupees', () => expect(parseInr('154668.6')).toBe(154669));

  it.each([
    ['2026-10-17', '2026-10-17'],
    ['2026-10-17T07:10:00+05:30', '2026-10-17'],
    ['17/10/2026', '2026-10-17'],
    ['7/1/2026', '2026-01-07'],
    ['17-Oct-2026', '2026-10-17'],
    ['17 October 2026', '2026-10-17'],
    ['46312', '2026-10-17'],
  ])('parses date %s', (raw, iso) => expect(parseDate(raw)).toBe(iso));
});
