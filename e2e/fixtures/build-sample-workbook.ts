import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readXlsx, rowsToCsv } from '@drishti/engine';
import { makeXlsx } from '../tests/xlsx';

// One workbook with everything the sandbox reads (fictional Lumora Skin data): the template's settings tabs and
// one tab per sample export. Upload it to Google Sheets, share it as "Anyone with the link can view", and link it
// in /try. Run: pnpm --filter @drishti/e2e exec tsx fixtures/build-sample-workbook.ts <out.xlsx>

const root = path.resolve(import.meta.dirname, '../../sample-data');
const out =
  process.argv[2] ?? path.resolve(import.meta.dirname, '../../apps/web/public/samples/Drishti-Sandbox-Sample.xlsx');

const KEEP = [
  'README',
  'Settings',
  'Products',
  'Channels',
  'Watchlist',
  'Creators',
  'Targets',
  'Calendar',
  'Rules',
  'Users',
  'Mappings',
  'Actions',
  'Tests',
];
const template = readXlsx(new Uint8Array(readFileSync(path.join(root, 'Drishti-Workspace-Template.xlsx'))));
const tabs: Record<string, string> = {};
for (const s of template) if (KEEP.includes(s.name)) tabs[s.name] = rowsToCsv(s.rows);

const DATA: [string, string][] = [
  ['Shopify orders', 'shopify_orders_export.csv'],
  ['Amazon sales', 'amazon_business_report_daily.csv'],
  ['Amazon Ads', 'amazon_ads_campaigns_daily.csv'],
  ['Amazon search', 'amazon_brand_analytics_search_query.csv'],
  ['Flipkart sales', 'flipkart_sales_daily.csv'],
  ['Flipkart Ads', 'flipkart_ads_daily.csv'],
  ['Nykaa sales', 'nykaa_sales_weekly.csv'],
  ['Quick commerce', 'quick_commerce_store_daily.csv'],
  ['Meta Ads', 'meta_ads_daily.csv'],
  ['Google Ads', 'google_ads_daily.csv'],
  ['Google Trends', 'google_trends_weekly.csv'],
  ['Reviews', 'reviews_export.csv'],
  ['Price captures', 'watchlist_captures.csv'],
];
for (const [name, file] of DATA) tabs[name] = readFileSync(path.join(root, 'inbox', file), 'utf8').trim();

writeFileSync(out, makeXlsx(tabs));
console.log(`wrote ${out} with ${Object.keys(tabs).length} tabs`);
