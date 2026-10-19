import { CHANNELS, MEDIA, type Channel, type Media } from '@drishti/shared';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { parseBool, parseCsvObjects, parseDate, parseInr, parseNumber } from '../csv';
import type { Facts, OwnSiteCustomer, OwnSiteOrder, TrendsWeekly } from './types';

// Loaders for the canonical demo fact CSVs in sample-data/demo (docs/06 §1, docs/11 §9).
// `read(name)` returns a file's text, so the same code runs in Node (build, tests) and in the browser (sandbox).

export type ReadFile = (name: string) => string;

export const DEMO_FILES = {
  sales_city_daily: 'fact_sales_city_daily.csv',
  sales_sku_daily: 'fact_sales_sku_daily.csv',
  spend_city_daily: 'fact_spend_city_daily.csv',
  orders_own_site: 'own_site_orders_sample.csv',
  order_lines_own_site: 'own_site_order_lines_sample.csv',
  customers_own_site: 'own_site_customers_sample.csv',
  qc_store_daily: 'quick_commerce_store_daily.csv',
  reviews: 'reviews.csv',
  market_captures: 'market_captures.csv',
  search_share_weekly: 'search_share_weekly.csv',
  products: 'products.csv',
  creator_posts: 'creator_posts_truth.csv',
} as const;

/** Customer IDs are hashed on read: sha256(key || id) (docs/05 §10). */
export function hashCustomerId(key: string, id: string): string {
  return bytesToHex(sha256(utf8ToBytes(key + id))).slice(0, 24);
}

const num = (v: string | undefined) => parseNumber(v) ?? 0;
const inr = (v: string | undefined) => parseInr(v) ?? 0;
const date = (v: string | undefined) => parseDate(v) ?? '';
const channel = (v: string | undefined): Channel => {
  if (!CHANNELS.includes(v as Channel)) throw new Error(`unknown channel ${v}`);
  return v as Channel;
};
const media = (v: string | undefined): Media => {
  if (!MEDIA.includes(v as Media)) throw new Error(`unknown media ${v}`);
  return v as Media;
};

export function loadDemoFacts(read: ReadFile, opts: { hashKey: string }): Facts {
  const rows = (name: keyof typeof DEMO_FILES) => parseCsvObjects(read(DEMO_FILES[name])).rows;
  const key = (id: string | undefined) => hashCustomerId(opts.hashKey, id ?? '');

  return {
    sales_city_daily: rows('sales_city_daily').map((r) => ({
      date: date(r.date),
      city: r.city ?? '',
      state: r.state ?? '',
      channel: channel(r.channel),
      orders: num(r.orders),
      units: num(r.units),
      net_revenue_inr: inr(r.net_revenue_inr),
      returned_orders: num(r.returned_orders),
    })),
    sales_sku_daily: rows('sales_sku_daily').map((r) => ({
      date: date(r.date),
      channel: channel(r.channel),
      sku: r.sku ?? '',
      units: num(r.units),
      net_revenue_inr: inr(r.net_revenue_inr),
      returned_units: num(r.returned_units),
    })),
    spend_city_daily: rows('spend_city_daily').map((r) => ({
      date: date(r.date),
      city: r.city ?? '',
      media: media(r.media),
      platform: r.platform ?? '',
      spend_inr: inr(r.spend_inr),
      platform_claimed_revenue_inr: inr(r.platform_claimed_revenue_inr),
    })),
    orders_own_site: rows('orders_own_site').map((r): OwnSiteOrder => ({
      order_id: r.order_id ?? '',
      created_at: r.created_at ?? '',
      date: date(r.created_at),
      customer_key: key(r.customer_id ?? r.customer_key),
      city: r.city ?? '',
      state: r.state ?? '',
      payment_method: r.payment_method === 'COD' ? 'COD' : 'Prepaid',
      discount_code: r.discount_code ?? '',
      discount_inr: inr(r.discount_inr),
      gross_inr: inr(r.gross_inr),
      net_inr: inr(r.net_inr),
      status: (r.status as OwnSiteOrder['status']) || 'Delivered',
      first_order: parseBool(r.first_order),
    })),
    order_lines_own_site: rows('order_lines_own_site').map((r) => ({
      order_id: r.order_id ?? '',
      sku: r.sku ?? '',
      qty: num(r.qty),
      unit_price_inr: inr(r.unit_price_inr),
    })),
    // The demo file's extra column true_segment_do_not_use_in_model is dropped here on purpose.
    customers_own_site: rows('customers_own_site').map((r): OwnSiteCustomer => ({
      customer_key: key(r.customer_id ?? r.customer_key),
      first_order_date: date(r.first_order_date),
      city: r.city ?? '',
      state: r.state ?? '',
      acquisition_source: (r.acquisition_source as OwnSiteCustomer['acquisition_source']) || 'unknown',
    })),
    qc_store_daily: rows('qc_store_daily').map((r) => ({
      date: date(r.date),
      platform: r.platform ?? '',
      city: r.city ?? '',
      store_id: r.store_id ?? '',
      sku: r.sku ?? '',
      units: num(r.units),
      gmv_inr: inr(r.gmv_inr),
      closing_stock: num(r.closing_stock),
      stockout: parseBool(r.stockout),
      ad_spend_inr: inr(r.ad_spend_inr),
    })),
    reviews: rows('reviews').map((r) => ({
      review_id: r.review_id ?? '',
      platform: r.platform ?? '',
      sku: r.sku ?? '',
      review_date: date(r.review_date),
      rating: num(r.rating),
      text: (r.text ?? '').slice(0, 1000),
      verified_purchase: parseBool(r.verified_purchase),
      brand_replied: parseBool(r.brand_replied),
      aspects: [],
    })),
    market_captures: rows('market_captures').map((r) => {
      const price = inr(r.price_inr);
      const mrp = parseInr(r.mrp_inr);
      return {
        captured_at: r.captured_at ?? '',
        platform: r.platform ?? '',
        label: r.label ?? '',
        brand: r.brand ?? '',
        product_name: r.product_name ?? '',
        pack_ml: num(r.pack_ml),
        price_inr: price,
        // A capture with MRP below price is a marketplace glitch: ignore the MRP (docs/03 §4).
        mrp_inr: mrp !== null && mrp >= price ? mrp : null,
        rating: num(r.rating),
        review_count: num(r.review_count),
        in_stock: parseBool(r.in_stock),
        capture_method: r.capture_method === 'site_json' ? 'site_json' : 'extension',
        url: r.url ?? '',
      };
    }),
    search_share_weekly: rows('search_share_weekly').map((r) => ({
      week_ending: date(r.week_ending),
      search_query: r.search_query ?? '',
      search_volume: num(r.search_volume),
      impression_share: num(r.impression_share),
      click_share: num(r.click_share),
      purchases_total: num(r.purchases_total),
      purchase_share: num(r.purchase_share),
    })),
    // The demo products file uses mrp / unit_cost; the Sheet tab uses mrp_inr / unit_cost_inr. Accept both.
    products: rows('products').map((r) => ({
      sku: r.sku ?? '',
      name: r.name ?? '',
      category: r.category ?? '',
      pack_ml: num(r.pack_ml),
      mrp_inr: inr(r.mrp_inr ?? r.mrp),
      unit_cost_inr: inr(r.unit_cost_inr ?? r.unit_cost),
      launch_date: date(r.launch_date),
      hero: parseBool(r.hero),
      asin: r.asin ?? '',
      fsn: r.fsn ?? '',
      nykaa_id: r.nykaa_id ?? '',
    })),
    creator_posts: rows('creator_posts').map((r) => ({
      post_date: date(r.post_date),
      creator: r.creator ?? '',
      handle: r.handle ?? '',
      platform: r.platform ?? '',
      followers: num(r.followers),
      audience_cities: (r.audience_cities ?? '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      cost_inr: inr(r.cost_inr),
      product_sku: r.product_sku ?? '',
      post_url: r.post_url ?? '',
      discount_code: r.discount_code ?? '',
    })),
  };
}

/** Google Trends weekly CSV in long form (Week, Term, Region, Interest), as in sample-data/inbox. */
export function loadTrends(text: string): TrendsWeekly[] {
  return parseCsvObjects(text).rows.map((r) => ({
    week: date(r.Week ?? r.week),
    term: r.Term ?? r.term ?? '',
    region: r.Region ?? r.region ?? '',
    interest: num(r.Interest ?? r.interest),
  }));
}
