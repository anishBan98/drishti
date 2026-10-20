import type { CalendarEvent } from '../facts/workspace';
import type { OwnSiteCustomer, OwnSiteOrder, OwnSiteOrderLine, Product } from '../facts/types';
import { daysBetween, inRange, type Windows } from '../windows';
import { kmeans, silhouette } from './kmeans';
import { mean, median, mulberry32 } from './random';

// Customer types (docs/08-METHODS.md §7). Features per own-site customer with an order in the last 365 days,
// z-scored and winsorised at ±3, k-means with k = 5 and seed 7; named and flagged by rule.

export const SEGMENT_NAMES = [
  'Routine Loyalists',
  'Ingredient Explorers',
  'Festive Gifters',
  'Deal Hunters',
  'One-time Trialists',
] as const;

export interface SegmentStats {
  index: number;
  name: string;
  kind: 'preferred' | 'problem' | 'other';
  customers: number;
  buyers_pct: number;
  revenue_pct: number;
  aov: number;
  orders_per_year: number;
  repeat_pct: number;
  discount_pct: number;
  cod_pct: number;
  rto_pct: number;
  cac: number;
  ltv_12m: number;
  ltv_cac: number;
  centroid: { orders: number; aov: number };
  sample: [number, number][];
}

export interface SegmentResult {
  k: number;
  signals: number;
  silhouette: number;
  segments: SegmentStats[];
}

interface CustomerRow {
  key: string;
  orders: OwnSiteOrder[];
  source: OwnSiteCustomer['acquisition_source'];
}

/** Fewer customers than this in 365 days and no types are formed (10 per type for k = 5). */
export const MIN_CUSTOMERS = 50;

export function segmentCustomers(input: {
  orders: OwnSiteOrder[];
  lines: OwnSiteOrderLine[];
  customers: OwnSiteCustomer[];
  products: Product[];
  calendar: CalendarEvent[];
  w: Windows;
  /** CAC per acquisition source (rupees), from the impact model. */
  cacBySource: Partial<Record<OwnSiteCustomer['acquisition_source'], number>>;
  k?: number;
}): SegmentResult {
  const { w, k = 5 } = input;
  const year = input.orders.filter((o) => inRange(o.date, w.d365));
  const sourceOf = new Map(input.customers.map((c) => [c.customer_key, c.acquisition_source]));
  const category = new Map(input.products.map((p) => [p.sku, p.category]));
  const linesBy = new Map<string, OwnSiteOrderLine[]>();
  for (const l of input.lines) linesBy.set(l.order_id, [...(linesBy.get(l.order_id) ?? []), l]);
  const festive = input.calendar.filter((e) => e.type === 'festival' || e.type === 'sale');
  const inFestive = (d: string) => festive.some((e) => d >= e.start_date && d <= e.end_date);

  const byCustomer = new Map<string, CustomerRow>();
  for (const o of year) {
    const row = byCustomer.get(o.customer_key) ?? {
      key: o.customer_key,
      orders: [],
      source: sourceOf.get(o.customer_key) ?? 'unknown',
    };
    row.orders.push(o);
    byCustomer.set(o.customer_key, row);
  }
  const rows = [...byCustomer.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  // Too few own-site customers to form k types: no types rather than unstable ones (docs/08 §7.2).
  if (rows.length < MIN_CUSTOMERS) return { k, signals: 0, silhouette: 0, segments: [] };
  for (const r of rows) r.orders.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  // §7.1 features
  const raw = rows.map((r) => {
    const n = r.orders.length;
    const cod = r.orders.filter((o) => o.payment_method === 'COD');
    const cats = new Set(
      r.orders.flatMap((o) => (linesBy.get(o.order_id) ?? []).map((l) => category.get(l.sku) ?? l.sku)),
    );
    const gaps = r.orders.slice(1).map((o, i) => daysBetween(r.orders[i]!.date, o.date));
    return [
      Math.log1p(n),
      Math.log(Math.max(1, mean(r.orders.map((o) => o.net_inr)))),
      r.orders.filter((o) => o.discount_code).length / n,
      cod.length / n,
      cod.length ? cod.filter((o) => o.status === 'RTO').length / cod.length : 0,
      Math.min(cats.size, 4) / 4,
      -Math.log1p(daysBetween(r.orders[n - 1]!.date, w.today)),
      n >= 2 ? Math.log1p(median(gaps)) : Math.log1p(365),
    ];
  });
  const dims = raw[0]?.length ?? 0;
  const mu = Array.from({ length: dims }, (_, j) => mean(raw.map((x) => x[j]!)));
  const sd = Array.from({ length: dims }, (_, j) => Math.sqrt(mean(raw.map((x) => (x[j]! - mu[j]!) ** 2))) || 1);
  const z = raw.map((x) => x.map((v, j) => Math.max(-3, Math.min(3, (v - mu[j]!) / sd[j]!))));

  const fit = kmeans(z, k, { seed: 7 });
  const totalRevenue = year.reduce((a, o) => a + o.net_inr, 0);

  // Repeat revenue per customer-month after the first order, used to project 12-month value (v1 ratio method).
  const stats: SegmentStats[] = Array.from({ length: k }, (_, c) => {
    const members = rows.filter((_, i) => fit.labels[i] === c);
    const orders = members.flatMap((m) => m.orders);
    const revenue = orders.reduce((a, o) => a + o.net_inr, 0);
    const cod = orders.filter((o) => o.payment_method === 'COD');
    let repeatRevenue = 0;
    let monthsObserved = 0;
    for (const m of members) {
      repeatRevenue += m.orders.slice(1).reduce((a, o) => a + o.net_inr, 0);
      monthsObserved += Math.max(0.5, daysBetween(m.orders[0]!.date, w.d365[1]) / 30.4);
    }
    const perMonth = monthsObserved ? repeatRevenue / monthsObserved : 0;
    const firstValue = mean(members.map((m) => m.orders[0]!.net_inr));
    const ltv = firstValue + perMonth * 12;
    const cac = mean(members.map((m) => input.cacBySource[m.source] ?? 0));
    const ordersPerYear = members.length ? orders.length / members.length : 0;
    const aov = orders.length ? revenue / orders.length : 0;
    return {
      index: c,
      name: '',
      kind: 'other',
      customers: members.length,
      buyers_pct: members.length / rows.length,
      revenue_pct: totalRevenue ? revenue / totalRevenue : 0,
      aov,
      orders_per_year: ordersPerYear,
      repeat_pct: members.length ? members.filter((m) => m.orders.length >= 2).length / members.length : 0,
      discount_pct: orders.length ? orders.filter((o) => o.discount_code).length / orders.length : 0,
      cod_pct: orders.length ? cod.length / orders.length : 0,
      rto_pct: cod.length ? cod.filter((o) => o.status === 'RTO').length / cod.length : 0,
      cac,
      ltv_12m: ltv,
      ltv_cac: cac ? ltv / cac : 0,
      centroid: { orders: ordersPerYear, aov },
      sample: [],
      festiveShare: orders.length ? orders.filter((o) => inFestive(o.date)).length / orders.length : 0,
    } as SegmentStats & { festiveShare: number };
  });

  // §7.3 names (first matching rule; each name used once) and flags
  const aovRank = [...stats].sort((a, b) => b.aov - a.aov).map((s) => s.index);
  const used = new Set<string>();
  const rules: [string, (s: SegmentStats & { festiveShare: number }) => boolean][] = [
    ['Routine Loyalists', (s) => s.orders_per_year >= 3 && s.repeat_pct >= 0.6],
    ['Ingredient Explorers', (s) => aovRank.slice(0, 2).includes(s.index) && s.orders_per_year >= 1.8],
    ['Festive Gifters', (s) => s.festiveShare >= 0.5],
    ['Deal Hunters', (s) => s.discount_pct >= 0.5 && s.cod_pct >= 0.5],
    ['One-time Trialists', (s) => s.orders_per_year < 1.15 && s.repeat_pct < 0.1],
  ];
  // Each name goes to the best-matching cluster among those that pass its rule, in rule order.
  const score: Record<string, (s: SegmentStats & { festiveShare: number }) => number> = {
    'Routine Loyalists': (s) => s.orders_per_year + s.repeat_pct,
    'Ingredient Explorers': (s) => s.aov,
    'Festive Gifters': (s) => s.festiveShare,
    'Deal Hunters': (s) => s.discount_pct + s.cod_pct,
    'One-time Trialists': (s) => -s.orders_per_year,
  };
  const all = stats as (SegmentStats & { festiveShare: number })[];
  for (const [name, test] of rules) {
    const pick = all.filter((s) => !s.name && test(s)).sort((a, b) => score[name]!(b) - score[name]!(a))[0];
    if (pick) {
      pick.name = name;
      used.add(name);
    }
  }
  for (const s of all) if (!s.name) s.name = `Type ${s.index + 1}`;
  const preferred = [...stats].sort((a, b) => b.ltv_cac - a.ltv_cac || b.revenue_pct - a.revenue_pct)[0];
  if (preferred) preferred.kind = 'preferred';
  const problem = stats
    .filter((s) => s.kind !== 'preferred' && s.ltv_cac < 2)
    .sort((a, b) => b.discount_pct + b.cod_pct + 2 * b.rto_pct - (a.discount_pct + a.cod_pct + 2 * a.rto_pct))[0];
  if (problem) problem.kind = 'problem';

  // §7.4 map sample: up to 120 customers stratified by cluster, deterministic, jittered ±0.08 orders.
  const rand = mulberry32(11);
  for (const s of stats) {
    const members = rows.filter((_, i) => fit.labels[i] === s.index);
    const take = Math.max(1, Math.round(120 * s.buyers_pct));
    const step = Math.max(1, Math.floor(members.length / take));
    s.sample = members
      .filter((_, i) => i % step === 0)
      .slice(0, take)
      .map((m) => {
        const aov = mean(m.orders.map((o) => o.net_inr));
        return [round2(m.orders.length + (rand() - 0.5) * 0.16), Math.round(aov)];
      });
    delete (s as Partial<{ festiveShare: number }>).festiveShare;
  }

  return { k, signals: dims, silhouette: silhouette(z, fit.labels, k), segments: stats };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
