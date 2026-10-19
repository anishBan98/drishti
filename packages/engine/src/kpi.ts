import { CHANNELS, MEDIA, type Channel, type Media } from '@drishti/shared';
import type { OwnSiteCustomer, OwnSiteOrder, Review, SalesCityDaily, SpendCityDaily } from './facts/types';
import { inRange, type Range, type Windows } from './windows';

// KPI definitions (docs/08-METHODS.md §2). Golden values: sample-data/expected/expected_metrics.json.

export interface SalesTotals {
  net_revenue_inr: number;
  orders: number;
  units: number;
  aov_inr: number;
  return_rate: number;
}

export function salesTotals(
  rows: SalesCityDaily[],
  range: Range,
  filter?: (r: SalesCityDaily) => boolean,
): SalesTotals {
  let revenue = 0;
  let orders = 0;
  let units = 0;
  let returned = 0;
  for (const r of rows) {
    if (!inRange(r.date, range) || (filter && !filter(r))) continue;
    revenue += r.net_revenue_inr;
    orders += r.orders;
    units += r.units;
    returned += r.returned_orders;
  }
  return {
    net_revenue_inr: revenue,
    orders,
    units,
    aov_inr: orders ? revenue / orders : 0,
    return_rate: orders ? returned / orders : 0,
  };
}

export function salesByChannel(rows: SalesCityDaily[], range: Range): Record<Channel, SalesTotals> {
  return Object.fromEntries(CHANNELS.map((c) => [c, salesTotals(rows, range, (r) => r.channel === c)])) as Record<
    Channel,
    SalesTotals
  >;
}

export interface MediaTotals {
  spend_inr: number;
  platform_claimed_revenue_inr: number;
  /** null when spend is zero ("—" on screen, docs/03 §4). */
  claimed_roas: number | null;
}

export function mediaTotals(rows: SpendCityDaily[], range: Range): Record<Media, MediaTotals> {
  const out = Object.fromEntries(
    MEDIA.map((m) => [m, { spend_inr: 0, platform_claimed_revenue_inr: 0, claimed_roas: null }]),
  ) as Record<Media, MediaTotals>;
  for (const r of rows) {
    if (!inRange(r.date, range)) continue;
    out[r.media].spend_inr += r.spend_inr;
    out[r.media].platform_claimed_revenue_inr += r.platform_claimed_revenue_inr;
  }
  for (const m of MEDIA) {
    const t = out[m];
    t.claimed_roas = t.spend_inr ? t.platform_claimed_revenue_inr / t.spend_inr : null;
  }
  return out;
}

export interface OwnSiteStats {
  customers: number;
  orders: number;
  orders_last_28_days: number;
  buyers_last_28_days: number;
  /** Share of buyers in the last 365 days with two or more orders in those 365 days. */
  repeat_customers_share_12m: number;
  cod_share: number;
  rto_share_of_cod: number;
}

export function ownSiteStats(orders: OwnSiteOrder[], customers: OwnSiteCustomer[], w: Windows): OwnSiteStats {
  const year = orders.filter((o) => inRange(o.date, w.d365));
  const last28 = year.filter((o) => inRange(o.date, w.d28));
  const perCustomer = new Map<string, number>();
  for (const o of year) perCustomer.set(o.customer_key, (perCustomer.get(o.customer_key) ?? 0) + 1);
  const repeaters = [...perCustomer.values()].filter((n) => n >= 2).length;
  const cod = year.filter((o) => o.payment_method === 'COD');
  return {
    customers: customers.length,
    orders: orders.length,
    orders_last_28_days: last28.length,
    buyers_last_28_days: new Set(last28.map((o) => o.customer_key)).size,
    repeat_customers_share_12m: perCustomer.size ? repeaters / perCustomer.size : 0,
    cod_share: year.length ? cod.length / year.length : 0,
    rto_share_of_cod: cod.length ? cod.filter((o) => o.status === 'RTO').length / cod.length : 0,
  };
}

/** Reviews naming the pump or dispenser (the pump_packaging defect keywords). */
export const PUMP_MENTION = /\b(pump|dispenser)\b/i;

export interface ReviewStats {
  count_last_90_days: number;
  avg_rating_last_90_days: number;
  /** All reviews in the last 30 days that name the pump or dispenser (golden key pump_negative_last_30_days). */
  pump_mentions_last_30_days: number;
  /** The subset rated 3 stars or below. */
  pump_negative_last_30_days: number;
  reply_rate: number;
}

export function reviewStats(reviews: Review[], w: Windows): ReviewStats {
  const r90 = reviews.filter((r) => inRange(r.review_date, w.d90));
  const pump30 = reviews.filter((r) => inRange(r.review_date, w.d30) && PUMP_MENTION.test(r.text));
  return {
    count_last_90_days: r90.length,
    avg_rating_last_90_days: r90.length ? r90.reduce((a, r) => a + r.rating, 0) / r90.length : 0,
    pump_mentions_last_30_days: pump30.length,
    pump_negative_last_30_days: pump30.filter((r) => r.rating <= 3).length,
    reply_rate: r90.length ? r90.filter((r) => r.brand_replied).length / r90.length : 0,
  };
}

/** Last date with any sales row: the snapshot's data_through. */
export function dataThrough(rows: SalesCityDaily[]): string {
  let max = '';
  for (const r of rows) if (r.date > max) max = r.date;
  return max;
}
