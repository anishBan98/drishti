import type { Channel, Media } from '@drishti/shared';

// Canonical fact tables (docs/06-DATA-MODEL.md §1). Money is integer rupees; dates are YYYY-MM-DD in IST.

export interface SalesCityDaily {
  date: string;
  city: string;
  state: string;
  channel: Channel;
  orders: number;
  units: number;
  net_revenue_inr: number;
  returned_orders: number;
}

export interface SalesSkuDaily {
  date: string;
  channel: Channel;
  sku: string;
  units: number;
  net_revenue_inr: number;
  returned_units: number;
}

export interface SpendCityDaily {
  date: string;
  city: string;
  media: Media;
  platform: string;
  spend_inr: number;
  platform_claimed_revenue_inr: number;
}

export interface OwnSiteOrder {
  order_id: string;
  created_at: string;
  date: string;
  customer_key: string;
  city: string;
  state: string;
  payment_method: 'COD' | 'Prepaid';
  discount_code: string;
  discount_inr: number;
  gross_inr: number;
  net_inr: number;
  status: 'Delivered' | 'RTO' | 'Returned' | 'Cancelled';
  first_order: boolean;
}

export interface OwnSiteOrderLine {
  order_id: string;
  sku: string;
  qty: number;
  unit_price_inr: number;
}

export interface OwnSiteCustomer {
  customer_key: string;
  first_order_date: string;
  city: string;
  state: string;
  acquisition_source: 'meta' | 'google' | 'creators' | 'referral' | 'organic' | 'unknown';
}

export interface QcStoreDaily {
  date: string;
  platform: string;
  city: string;
  store_id: string;
  sku: string;
  units: number;
  gmv_inr: number;
  closing_stock: number;
  stockout: boolean;
  ad_spend_inr: number;
}

export type AspectId =
  | 'pump_packaging'
  | 'gentle'
  | 'results'
  | 'texture'
  | 'fragrance'
  | 'value'
  | 'delivery'
  | 'oxidation'
  | 'size_claim'
  | 'authenticity';

export interface ReviewAspect {
  aspect: AspectId;
  sentiment: -1 | 0 | 1;
  source: 'ai' | 'lexicon';
}

export interface Review {
  review_id: string;
  platform: string;
  sku: string;
  review_date: string;
  rating: number;
  text: string;
  verified_purchase: boolean;
  brand_replied: boolean;
  aspects: ReviewAspect[];
}

export interface MarketCapture {
  captured_at: string;
  platform: string;
  label: string;
  brand: string;
  product_name: string;
  pack_ml: number;
  price_inr: number;
  mrp_inr: number | null;
  rating: number;
  review_count: number;
  in_stock: boolean;
  capture_method: 'extension' | 'site_json';
  url: string;
  top_reviews?: string[];
}

export interface SearchShareWeekly {
  week_ending: string;
  search_query: string;
  search_volume: number;
  impression_share: number;
  click_share: number;
  purchases_total: number;
  purchase_share: number;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  pack_ml: number;
  mrp_inr: number;
  unit_cost_inr: number;
  launch_date: string;
  hero: boolean;
  asin: string;
  fsn: string;
  nykaa_id: string;
}

export interface CreatorPost {
  post_date: string;
  creator: string;
  handle: string;
  platform: string;
  followers: number;
  audience_cities: string[];
  cost_inr: number;
  product_sku: string;
  post_url: string;
  discount_code: string;
}

export interface TrendsWeekly {
  week: string;
  term: string;
  region: string;
  interest: number;
}

export interface Facts {
  sales_city_daily: SalesCityDaily[];
  sales_sku_daily: SalesSkuDaily[];
  spend_city_daily: SpendCityDaily[];
  orders_own_site: OwnSiteOrder[];
  order_lines_own_site: OwnSiteOrderLine[];
  customers_own_site: OwnSiteCustomer[];
  qc_store_daily: QcStoreDaily[];
  reviews: Review[];
  market_captures: MarketCapture[];
  search_share_weekly: SearchShareWeekly[];
  products: Product[];
  creator_posts: CreatorPost[];
  /** Google Trends (docs/06 §1.10); optional. */
  trends_weekly?: TrendsWeekly[];
}
