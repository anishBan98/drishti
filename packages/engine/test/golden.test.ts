import { CHANNELS, MEDIA } from '@drishti/shared';
import { describe, expect, it } from 'vitest';
import {
  dataThrough,
  mediaTotals,
  ownSiteStats,
  reviewStats,
  salesByChannel,
  salesTotals,
  type SalesTotals,
} from '../src/kpi';
import { addDays, windowsFor } from '../src/windows';
import { demoFacts, expected } from './helpers';

// Golden tests (docs/12 §2 GOLD-01..04). Sums exact to the rupee; ratios within 0.001; AOV to the paisa.
const facts = demoFacts();
const today = addDays(dataThrough(facts.sales_city_daily), 1);
const w = windowsFor(today);

function expectTotals(actual: SalesTotals, gold: Record<string, number>) {
  expect(actual.net_revenue_inr).toBe(gold.net_revenue_inr);
  expect(actual.orders).toBe(gold.orders);
  expect(actual.units).toBe(gold.units);
  expect(Math.round(actual.aov_inr * 100) / 100).toBeCloseTo(gold.aov_inr!, 2);
  expect(Math.abs(actual.return_rate - gold.return_rate!)).toBeLessThanOrEqual(0.001);
}

describe('windows (docs/08 §1)', () => {
  it('match the golden windows for the demo data', () => {
    expect(today).toBe(expected.today);
    expect(w.d28).toEqual(expected.windows.last_28_days);
    expect(w.prior_d28).toEqual(expected.windows.prior_28_days);
    expect(w.week).toEqual(expected.windows.this_week);
    expect(w.prior_week).toEqual(expected.windows.prior_week);
  });
});

describe('GOLD-01 last 28 days', () => {
  it('revenue, orders, units, AOV and return rate', () => {
    expectTotals(salesTotals(facts.sales_city_daily, w.d28), expected.last_28_days);
  });
});

describe('GOLD-02 prior 28 days, this week, prior week', () => {
  it.each([
    ['prior_28_days', 'prior_d28'],
    ['this_week', 'week'],
    ['prior_week', 'prior_week'],
  ] as const)('%s', (gold, win) => {
    expectTotals(salesTotals(facts.sales_city_daily, w[win]), expected[gold]);
  });
});

describe('GOLD-03 by channel and by medium', () => {
  const byChannel = salesByChannel(facts.sales_city_daily, w.d28);
  it.each(CHANNELS)('channel %s', (c) => expectTotals(byChannel[c], expected.last_28_days_by_channel[c]));

  const media = mediaTotals(facts.spend_city_daily, w.d28);
  it.each(MEDIA)('medium %s spend, claimed and claimed ROAS', (m) => {
    const gold = expected.last_28_days_media[m];
    expect(media[m].spend_inr).toBe(gold.spend_inr);
    expect(media[m].platform_claimed_revenue_inr).toBe(gold.platform_claimed_revenue_inr);
    expect(Math.abs(media[m].claimed_roas! - gold.claimed_roas)).toBeLessThanOrEqual(0.001);
  });

  it('total spend and total claimed', () => {
    const sum = (k: 'spend_inr' | 'platform_claimed_revenue_inr') => MEDIA.reduce((a, m) => a + media[m][k], 0);
    expect(sum('spend_inr')).toBe(expected.last_28_days_total_spend_inr);
    expect(sum('platform_claimed_revenue_inr')).toBe(expected.last_28_days_total_claimed_revenue_inr);
  });
});

describe('GOLD-04 own-site sample and reviews', () => {
  it('own-site counts, repeat share, COD share, RTO share of COD', () => {
    const s = ownSiteStats(facts.orders_own_site, facts.customers_own_site, w);
    const gold = expected.own_site_sample;
    expect(s.customers).toBe(gold.customers);
    expect(s.orders).toBe(gold.orders);
    expect(s.orders_last_28_days).toBe(gold.orders_last_28_days);
    expect(s.buyers_last_28_days).toBe(gold.buyers_last_28_days);
    for (const k of ['repeat_customers_share_12m', 'cod_share', 'rto_share_of_cod'] as const)
      expect(Math.abs(s[k] - gold[k]), k).toBeLessThanOrEqual(0.001);
  });

  it('reviews count, average rating, pump mentions in 30 days, reply rate', () => {
    const r = reviewStats(facts.reviews, w);
    const gold = expected.reviews;
    expect(r.count_last_90_days).toBe(gold.count_last_90_days);
    expect(Math.abs(r.avg_rating_last_90_days - gold.avg_rating_last_90_days)).toBeLessThanOrEqual(0.001);
    // The golden key says "negative" but counts every review naming the pump or dispenser (see CHANGELOG).
    expect(r.pump_mentions_last_30_days).toBe(gold.pump_negative_last_30_days);
    expect(r.pump_negative_last_30_days).toBeLessThan(r.pump_mentions_last_30_days);
    expect(Math.abs(r.reply_rate - gold.reply_rate)).toBeLessThanOrEqual(0.001);
  });
});
