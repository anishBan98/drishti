import type { Media } from '@drishti/shared';
import { parseBool, parseDate, parseInr, parseNumber } from '../csv';
import { hashCustomerId } from '../facts/demo';
import type {
  Facts,
  MarketCapture,
  OwnSiteCustomer,
  OwnSiteOrder,
  OwnSiteOrderLine,
  QcStoreDaily,
  Review,
  SalesCityDaily,
  SalesSkuDaily,
  SearchShareWeekly,
  SpendCityDaily,
  TrendsWeekly,
} from '../facts/types';

// Source detection and parsers for platform exports (docs/11-CONNECTORS.md §3). Each parser turns one file's rows
// into fact rows; rows without a city keep city "" and are allocated later (docs/06 §1.2).

/** Lowercase, strip punctuation, collapse spaces: "Amount spent (INR)" → "amount spent inr". */
export const normHeader = (h: string) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export type FactPart = Partial<{ [K in keyof Facts]: NonNullable<Facts[K]> }>;

export interface ParseContext {
  hashKey: string;
  warnings: string[];
}

export interface Table {
  headers: string[];
  rows: string[][];
  /** Value of the first matching column for a row (aliases already normalised). */
  get: (row: string[], names: readonly string[]) => string | undefined;
  has: (names: readonly string[]) => boolean;
}

export function makeTable(raw: string[][], mapping: Record<string, string> = {}): Table {
  const [head = [], ...rows] = raw;
  const headers = head.map((h) => {
    const n = normHeader(h);
    return mapping[n] ? normHeader(mapping[n]) : n;
  });
  const index = (names: readonly string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  return {
    headers,
    rows,
    get: (row, names) => {
      const i = index(names);
      return i === -1 ? undefined : row[i];
    },
    has: (names) => index(names) !== -1,
  };
}

export interface SourceDef {
  id: string;
  label: string;
  /** Filename prefix rule, checked before headers. */
  prefix?: RegExp;
  /** Each entry: a column name and its accepted aliases (normalised). */
  required: readonly (readonly string[])[];
  parse: (t: Table, ctx: ParseContext) => { part: FactPart; skipped: number; dates: string[] };
}

const n = (v: string | undefined) => parseNumber(v) ?? 0;
const inr = (v: string | undefined) => Math.round(parseInr(v) ?? 0);
const d = (v: string | undefined) => parseDate(v) ?? '';

/** Splits a weekly total across 7 days in whole units; the remainder goes on the last day. */
function spread(total: number, days = 7): number[] {
  const each = Math.floor(total / days);
  return Array.from({ length: days }, (_, i) => (i === days - 1 ? total - each * (days - 1) : each));
}
const addDays = (iso: string, k: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

const C = {
  date: ['date', 'day', 'order date', 'reporting starts'],
  sku: ['sku', 'seller sku', 'vendor sku', 'lineitem sku'],
  city: ['city', 'shipping city', 'region', 'city location of interest', 'ship city'],
} as const;

function spendRows(
  t: Table,
  media: Media,
  platform: string,
  cols: {
    spend: readonly string[];
    claimed: readonly (readonly string[])[];
    date: readonly string[];
    city?: readonly string[];
  },
) {
  const out: SpendCityDaily[] = [];
  const dates: string[] = [];
  let skipped = 0;
  for (const r of t.rows) {
    const date = d(t.get(r, cols.date));
    if (!date) {
      skipped++;
      continue;
    }
    dates.push(date);
    out.push({
      date,
      city: cols.city ? (t.get(r, cols.city) ?? '').trim() : '',
      media,
      platform,
      spend_inr: inr(t.get(r, cols.spend)),
      platform_claimed_revenue_inr: cols.claimed.reduce((s, c) => s + inr(t.get(r, c)), 0),
    });
  }
  return { part: { spend_city_daily: out }, skipped, dates };
}

export const SOURCES: readonly SourceDef[] = [
  {
    id: 'shopify_orders_csv',
    label: 'Shopify orders',
    prefix: /^shopify_orders/i,
    required: [['name', 'order', 'order id'], ['created at'], ['total'], ['lineitem sku']],
    parse(t, ctx) {
      const byOrder = new Map<string, { head: string[]; lines: string[][] }>();
      let skipped = 0;
      for (const r of t.rows) {
        const id = (t.get(r, ['name', 'order', 'order id']) ?? '').trim();
        if (!id) {
          skipped++;
          continue;
        }
        const o = byOrder.get(id);
        if (o) o.lines.push(r);
        else byOrder.set(id, { head: r, lines: [r] });
      }
      const orders: OwnSiteOrder[] = [];
      const lines: OwnSiteOrderLine[] = [];
      for (const [id, { head, lines: ls }] of byOrder) {
        const created = (t.get(head, ['created at']) ?? '').trim();
        const status = (t.get(head, ['fulfillment status', 'status']) ?? '').toLowerCase();
        const pay = (t.get(head, ['payment method', 'payment gateway']) ?? '').toLowerCase();
        orders.push({
          order_id: id,
          created_at: created,
          date: d(created),
          customer_key: hashCustomerId(ctx.hashKey, t.get(head, ['customer id', 'email']) ?? id),
          city: (t.get(head, ['shipping city', 'city']) ?? '').trim(),
          state: (t.get(head, ['shipping province', 'shipping province name', 'state']) ?? '').trim(),
          payment_method: /cod|cash/.test(pay) ? 'COD' : 'Prepaid',
          discount_code: (t.get(head, ['discount code']) ?? '').trim(),
          discount_inr: inr(t.get(head, ['discount amount'])),
          gross_inr: inr(t.get(head, ['subtotal'])) || inr(t.get(head, ['total'])),
          net_inr: inr(t.get(head, ['total'])),
          status: /rto/.test(status)
            ? 'RTO'
            : /return/.test(status)
              ? 'Returned'
              : /cancel|void/.test(status)
                ? 'Cancelled'
                : 'Delivered',
          first_order: false,
        });
        for (const l of ls)
          lines.push({
            order_id: id,
            sku: (t.get(l, ['lineitem sku']) ?? '').trim(),
            qty: n(t.get(l, ['lineitem quantity'])) || 1,
            unit_price_inr: inr(t.get(l, ['lineitem price'])),
          });
      }
      // First order per customer within the file, and customers from their first order.
      orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const customers = new Map<string, OwnSiteCustomer>();
      for (const o of orders) {
        if (customers.has(o.customer_key)) continue;
        o.first_order = true;
        customers.set(o.customer_key, {
          customer_key: o.customer_key,
          first_order_date: o.date,
          city: o.city,
          state: o.state,
          acquisition_source: o.discount_code ? 'creators' : 'unknown',
        });
      }
      // Daily sales by city and by SKU for the own-site channel.
      const city = new Map<string, SalesCityDaily>();
      const sku = new Map<string, SalesSkuDaily>();
      const linesBy = new Map<string, OwnSiteOrderLine[]>();
      for (const l of lines) linesBy.set(l.order_id, [...(linesBy.get(l.order_id) ?? []), l]);
      for (const o of orders) {
        if (o.status === 'Cancelled' || !o.date) continue;
        const ls = linesBy.get(o.order_id) ?? [];
        const units = ls.reduce((s, l) => s + l.qty, 0);
        const ck = `${o.date}|${o.city}`;
        const c = city.get(ck) ?? {
          date: o.date,
          city: o.city,
          state: o.state,
          channel: 'own_site' as const,
          orders: 0,
          units: 0,
          net_revenue_inr: 0,
          returned_orders: 0,
        };
        c.orders++;
        c.units += units;
        c.net_revenue_inr += o.net_inr;
        if (o.status !== 'Delivered') c.returned_orders++;
        city.set(ck, c);
        const gross = ls.reduce((s, l) => s + l.qty * l.unit_price_inr, 0) || 1;
        for (const l of ls) {
          const sk = `${o.date}|${l.sku}`;
          const s = sku.get(sk) ?? {
            date: o.date,
            channel: 'own_site' as const,
            sku: l.sku,
            units: 0,
            net_revenue_inr: 0,
            returned_units: 0,
          };
          s.units += l.qty;
          s.net_revenue_inr += Math.round((o.net_inr * l.qty * l.unit_price_inr) / gross);
          if (o.status !== 'Delivered') s.returned_units += l.qty;
          sku.set(sk, s);
        }
      }
      return {
        part: {
          orders_own_site: orders,
          order_lines_own_site: lines,
          customers_own_site: [...customers.values()],
          sales_city_daily: [...city.values()],
          sales_sku_daily: [...sku.values()],
        },
        skipped,
        dates: orders.map((o) => o.date).filter(Boolean),
      };
    },
  },
  {
    id: 'amazon_business_report',
    label: 'Amazon business report',
    prefix: /^amazon_business_report/i,
    required: [['child asin', 'asin'], ['units ordered'], ['ordered product sales'], ['date', 'day']],
    parse(t, ctx) {
      const sku: SalesSkuDaily[] = [];
      const city: SalesCityDaily[] = [];
      let skipped = 0;
      const hasOrders = t.has(['total order items', 'orders']);
      if (!hasOrders)
        ctx.warnings.push('amazon_business_report: no order count column; orders estimated as units ÷ 1.35.');
      for (const r of t.rows) {
        const date = d(t.get(r, ['date', 'day']));
        if (!date) {
          skipped++;
          continue;
        }
        const units = n(t.get(r, ['units ordered']));
        const rev = inr(t.get(r, ['ordered product sales']));
        const s = (t.get(r, ['sku']) ?? '').trim() || `asin:${(t.get(r, ['child asin', 'asin']) ?? '').trim()}`;
        sku.push({ date, channel: 'amazon', sku: s, units, net_revenue_inr: rev, returned_units: 0 });
        const orders = hasOrders ? n(t.get(r, ['total order items', 'orders'])) : Math.round(units / 1.35);
        city.push({
          date,
          city: '',
          state: '',
          channel: 'amazon',
          orders,
          units,
          net_revenue_inr: rev,
          returned_orders: 0,
        });
      }
      return { part: { sales_sku_daily: sku, sales_city_daily: city }, skipped, dates: sku.map((s) => s.date) };
    },
  },
  {
    id: 'amazon_ads',
    label: 'Amazon Ads',
    prefix: /^amazon_ads/i,
    required: [['campaign name'], ['spend', 'cost'], ['14 day total sales', 'sales 14 day', '7 day total sales']],
    parse: (t) =>
      spendRows(t, 'amazon_ads', 'Amazon Ads', {
        spend: ['spend', 'cost'],
        claimed: [['14 day total sales', 'sales 14 day', '7 day total sales']],
        date: C.date,
      }),
  },
  {
    id: 'amazon_brand_analytics',
    label: 'Amazon Brand Analytics',
    prefix: /^amazon_brand_analytics/i,
    required: [['search query'], ['search query volume', 'search volume'], ['purchases brand share', 'purchase share']],
    parse(t) {
      const out: SearchShareWeekly[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const week = d(t.get(r, ['week ending', 'reporting date', 'week']));
        const q = (t.get(r, ['search query']) ?? '').trim();
        if (!week || !q) {
          skipped++;
          continue;
        }
        out.push({
          week_ending: week,
          search_query: q,
          search_volume: n(t.get(r, ['search query volume', 'search volume'])),
          impression_share: n(t.get(r, ['impressions brand share', 'impression share'])),
          click_share: n(t.get(r, ['clicks brand share', 'click share'])),
          purchases_total: n(t.get(r, ['purchases total count', 'purchases total'])),
          purchase_share: n(t.get(r, ['purchases brand share', 'purchase share'])),
        });
      }
      return { part: { search_share_weekly: out }, skipped, dates: out.map((o) => o.week_ending) };
    },
  },
  {
    id: 'meta_ads',
    label: 'Meta Ads',
    prefix: /^meta_ads/i,
    required: [
      ['campaign name'],
      ['amount spent inr', 'amount spent'],
      ['purchases conversion value', 'website purchases conversion value'],
      ['day', 'reporting starts'],
    ],
    parse: (t) =>
      spendRows(t, 'meta', 'Meta', {
        spend: ['amount spent inr', 'amount spent'],
        claimed: [['purchases conversion value', 'website purchases conversion value']],
        date: ['day', 'reporting starts'],
        city: ['region', 'city'],
      }),
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    prefix: /^google_ads/i,
    required: [['campaign'], ['cost'], ['conv value', 'all conv value'], ['day']],
    parse: (t) =>
      spendRows(t, 'google', 'Google Ads', {
        spend: ['cost'],
        claimed: [['conv value', 'all conv value']],
        date: ['day'],
        city: ['city location of interest', 'city', 'location'],
      }),
  },
  {
    id: 'flipkart_sales',
    label: 'Flipkart sales',
    prefix: /^flipkart_sales/i,
    required: [['order date'], ['fsn'], ['final selling price', 'selling price'], ['quantity']],
    parse(t) {
      const sku: SalesSkuDaily[] = [];
      const city: SalesCityDaily[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const date = d(t.get(r, ['order date']));
        if (!date) {
          skipped++;
          continue;
        }
        const units = n(t.get(r, ['quantity']));
        const rev = inr(t.get(r, ['final selling price', 'selling price']));
        const ret = n(t.get(r, ['returns', 'returned quantity']));
        const s = (t.get(r, ['sku']) ?? '').trim() || `fsn:${(t.get(r, ['fsn']) ?? '').trim()}`;
        sku.push({ date, channel: 'flipkart', sku: s, units, net_revenue_inr: rev, returned_units: ret });
        city.push({
          date,
          city: (t.get(r, ['city', 'ship city']) ?? '').trim(),
          state: (t.get(r, ['state']) ?? '').trim(),
          channel: 'flipkart',
          orders: units,
          units,
          net_revenue_inr: rev,
          returned_orders: ret,
        });
      }
      return { part: { sales_sku_daily: sku, sales_city_daily: city }, skipped, dates: sku.map((s) => s.date) };
    },
  },
  {
    id: 'flipkart_ads',
    label: 'Flipkart Ads',
    prefix: /^flipkart_ads/i,
    required: [['ad spend'], ['direct revenue'], ['indirect revenue']],
    parse: (t) =>
      spendRows(t, 'flipkart_ads', 'Flipkart Ads', {
        spend: ['ad spend'],
        claimed: [['direct revenue'], ['indirect revenue']],
        date: C.date,
      }),
  },
  {
    id: 'nykaa_sales',
    label: 'Nykaa sales',
    prefix: /^nykaa_sales/i,
    required: [['nykaa sku code'], ['gmv'], ['units sold']],
    parse(t) {
      const sku: SalesSkuDaily[] = [];
      const city: SalesCityDaily[] = [];
      let skipped = 0;
      const dates: string[] = [];
      for (const r of t.rows) {
        const start = d(t.get(r, ['week start', 'week', 'date']));
        if (!start) {
          skipped++;
          continue;
        }
        const s =
          (t.get(r, ['vendor sku', 'sku']) ?? '').trim() || `nykaa:${(t.get(r, ['nykaa sku code']) ?? '').trim()}`;
        // Weekly file: spread each week evenly over its seven days.
        const units = spread(Math.round(n(t.get(r, ['units sold']))));
        const rev = spread(inr(t.get(r, ['gmv'])));
        const ret = spread(Math.round(n(t.get(r, ['returns']))));
        for (let k = 0; k < 7; k++) {
          const date = addDays(start, k);
          dates.push(date);
          sku.push({
            date,
            channel: 'nykaa',
            sku: s,
            units: units[k]!,
            net_revenue_inr: rev[k]!,
            returned_units: ret[k]!,
          });
          city.push({
            date,
            city: '',
            state: '',
            channel: 'nykaa',
            orders: units[k]!,
            units: units[k]!,
            net_revenue_inr: rev[k]!,
            returned_orders: ret[k]!,
          });
        }
      }
      return { part: { sales_sku_daily: sku, sales_city_daily: city }, skipped, dates };
    },
  },
  {
    id: 'quick_commerce',
    label: 'Quick commerce stores',
    prefix: /^quick_commerce/i,
    required: [
      ['store id', 'darkstore'],
      ['closing stock', 'inventory'],
      ['units', 'qty sold'],
    ],
    parse(t) {
      const qc: QcStoreDaily[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const date = d(t.get(r, ['date', 'day']));
        if (!date) {
          skipped++;
          continue;
        }
        const stock = n(t.get(r, ['closing stock', 'inventory']));
        const so = t.get(r, ['stockout', 'out of stock']);
        qc.push({
          date,
          platform: (t.get(r, ['platform']) ?? '').trim(),
          city: (t.get(r, ['city']) ?? '').trim(),
          store_id: (t.get(r, ['store id', 'darkstore']) ?? '').trim(),
          sku: (t.get(r, ['sku']) ?? '').trim(),
          units: n(t.get(r, ['units', 'qty sold'])),
          gmv_inr: inr(t.get(r, ['gmv inr', 'gmv', 'sales'])),
          closing_stock: stock,
          stockout: so === undefined ? stock <= 0 : parseBool(so),
          ad_spend_inr: inr(t.get(r, ['ad spend inr', 'ad spend'])),
        });
      }
      // Store rows roll up into quick-commerce sales by city and SKU, and QC ad spend by city.
      const city = new Map<string, SalesCityDaily>();
      const sku = new Map<string, SalesSkuDaily>();
      const spend = new Map<string, SpendCityDaily>();
      for (const q of qc) {
        const c = city.get(`${q.date}|${q.city}`) ?? {
          date: q.date,
          city: q.city,
          state: '',
          channel: 'quick_commerce' as const,
          orders: 0,
          units: 0,
          net_revenue_inr: 0,
          returned_orders: 0,
        };
        c.units += q.units;
        c.orders += q.units;
        c.net_revenue_inr += q.gmv_inr;
        city.set(`${q.date}|${q.city}`, c);
        const s = sku.get(`${q.date}|${q.sku}`) ?? {
          date: q.date,
          channel: 'quick_commerce' as const,
          sku: q.sku,
          units: 0,
          net_revenue_inr: 0,
          returned_units: 0,
        };
        s.units += q.units;
        s.net_revenue_inr += q.gmv_inr;
        sku.set(`${q.date}|${q.sku}`, s);
        if (q.ad_spend_inr) {
          const a = spend.get(`${q.date}|${q.city}`) ?? {
            date: q.date,
            city: q.city,
            media: 'qc_ads' as const,
            platform: 'Blinkit/Zepto/Instamart',
            spend_inr: 0,
            platform_claimed_revenue_inr: 0,
          };
          a.spend_inr += q.ad_spend_inr;
          spend.set(`${q.date}|${q.city}`, a);
        }
      }
      return {
        part: {
          qc_store_daily: qc,
          sales_city_daily: [...city.values()],
          sales_sku_daily: [...sku.values()],
          spend_city_daily: [...spend.values()],
        },
        skipped,
        dates: qc.map((q) => q.date),
      };
    },
  },
  {
    id: 'google_trends',
    label: 'Google Trends',
    prefix: /^google_trends/i,
    required: [['week'], ['term'], ['interest']],
    parse(t) {
      const out: TrendsWeekly[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const week = d(t.get(r, ['week']));
        if (!week) {
          skipped++;
          continue;
        }
        out.push({
          week,
          term: (t.get(r, ['term']) ?? '').trim(),
          region: (t.get(r, ['region']) ?? '').trim(),
          interest: n(t.get(r, ['interest'])),
        });
      }
      return { part: { trends_weekly: out }, skipped, dates: out.map((o) => o.week) };
    },
  },
  {
    id: 'reviews',
    label: 'Reviews',
    prefix: /^reviews/i,
    required: [['review id'], ['rating', 'star rating'], ['text', 'review text', 'review']],
    parse(t) {
      const out: Review[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const date = d(t.get(r, ['review date', 'date']));
        const id = (t.get(r, ['review id']) ?? '').trim();
        if (!date || !id) {
          skipped++;
          continue;
        }
        out.push({
          review_id: id,
          platform: (t.get(r, ['platform']) ?? '').trim(),
          sku: (t.get(r, ['sku']) ?? '').trim(),
          review_date: date,
          rating: n(t.get(r, ['rating', 'star rating'])),
          text: (t.get(r, ['text', 'review text', 'review']) ?? '').slice(0, 1000),
          verified_purchase: parseBool(t.get(r, ['verified purchase'])),
          brand_replied: parseBool(t.get(r, ['brand replied'])),
          aspects: [],
        });
      }
      return { part: { reviews: out }, skipped, dates: out.map((o) => o.review_date) };
    },
  },
  {
    id: 'watchlist_capture',
    label: 'Price and rating captures',
    prefix: /^(watchlist_captures|market_captures)/i,
    required: [['captured at'], ['price inr'], ['capture method']],
    parse(t) {
      const out: MarketCapture[] = [];
      let skipped = 0;
      for (const r of t.rows) {
        const at = (t.get(r, ['captured at']) ?? '').trim();
        if (!d(at)) {
          skipped++;
          continue;
        }
        const price = inr(t.get(r, ['price inr']));
        const mrp = parseInr(t.get(r, ['mrp inr']));
        out.push({
          captured_at: at,
          platform: (t.get(r, ['platform']) ?? '').trim(),
          label: (t.get(r, ['label']) ?? '').trim(),
          brand: (t.get(r, ['brand']) ?? '').trim(),
          product_name: (t.get(r, ['product name']) ?? '').trim(),
          pack_ml: n(t.get(r, ['pack ml'])),
          price_inr: price,
          mrp_inr: mrp !== null && mrp >= price ? Math.round(mrp) : null,
          rating: n(t.get(r, ['rating'])),
          review_count: n(t.get(r, ['review count'])),
          in_stock: parseBool(t.get(r, ['in stock'])),
          capture_method: t.get(r, ['capture method']) === 'site_json' ? 'site_json' : 'extension',
          url: (t.get(r, ['url']) ?? '').trim(),
        });
      }
      return { part: { market_captures: out }, skipped, dates: out.map((o) => d(o.captured_at)) };
    },
  },
];

/** Workspace Sheet tabs (docs/06 §2), recognised by tab or file name, or by their header signature. */
export const WORKSPACE_TABS: readonly { tab: string; required: readonly (readonly string[])[] }[] = [
  { tab: 'settings', required: [['key'], ['value']] },
  { tab: 'products', required: [['sku'], ['name'], ['pack ml']] },
  { tab: 'channels', required: [['channel'], ['commission pct']] },
  { tab: 'watchlist', required: [['watch id'], ['url']] },
  { tab: 'creators', required: [['post date'], ['creator'], ['cost inr']] },
  { tab: 'targets', required: [['kpi'], ['period'], ['target']] },
  { tab: 'calendar', required: [['start date'], ['end date'], ['event']] },
  { tab: 'rules', required: [['rule id'], ['condition']] },
  { tab: 'users', required: [['email'], ['role']] },
  { tab: 'mappings', required: [['source'], ['file column'], ['drishti field']] },
  { tab: 'tests', required: [['test id'], ['design']] },
  { tab: 'actions', required: [['action id'], ['expected inr']] },
];
