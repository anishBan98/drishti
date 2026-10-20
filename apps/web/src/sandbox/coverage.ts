import type { CopyKey } from '@drishti/shared';
import type { ScreenId } from '../components/Frame';
import type { TableSummary } from './protocol';

// Which screens a company's data can fill (docs/09 §6.12 coverage checklist). A screen without its data shows an
// EmptyState that says what to add, instead of zeros.

const SALES = ['shopify_orders_csv', 'amazon_business_report', 'flipkart_sales', 'nykaa_sales', 'quick_commerce'];
const ADS = ['meta_ads', 'google_ads', 'amazon_ads', 'flipkart_ads', 'quick_commerce', 'creators'];

export interface Coverage {
  screen: ScreenId;
  ok: boolean;
  /** What to add when not ok. */
  need: CopyKey;
}

export function coverageFor(tables: TableSummary[] | undefined): Coverage[] {
  const have = new Set((tables ?? []).filter((t) => t.source && t.rows > 0).map((t) => t.source!));
  const any = (ids: string[]) => ids.some((id) => have.has(id));
  return [
    { screen: 'week', ok: any(SALES), need: 'try.need.sales' },
    { screen: 'actions', ok: true, need: 'try.need.none' },
    { screen: 'performance', ok: any(SALES), need: 'try.need.sales' },
    { screen: 'impact', ok: any(SALES) && any(ADS), need: 'try.need.ads' },
    { screen: 'market', ok: have.has('watchlist_capture'), need: 'try.need.market' },
    { screen: 'customers', ok: have.has('shopify_orders_csv'), need: 'try.need.customers' },
    { screen: 'voice', ok: have.has('reviews'), need: 'try.need.voice' },
    { screen: 'data', ok: true, need: 'try.need.none' },
  ];
}
