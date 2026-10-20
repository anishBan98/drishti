import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SCREENS } from './helpers';
import { makeXlsx } from './xlsx';

// Sandbox (docs/09 §6.12, docs/12 E2E-24 and E2E-27): your own company from files or a linked Google Sheet.

const root = path.resolve(import.meta.dirname, '../../sample-data');
const INBOX = [
  'amazon_ads_campaigns_daily.csv',
  'amazon_brand_analytics_search_query.csv',
  'amazon_business_report_daily.csv',
  'flipkart_ads_daily.csv',
  'flipkart_sales_daily.csv',
  'google_ads_daily.csv',
  'google_trends_weekly.csv',
  'meta_ads_daily.csv',
  'nykaa_sales_weekly.csv',
  'quick_commerce_store_daily.csv',
  'reviews_export.csv',
  'shopify_orders_export.csv',
  'watchlist_captures.csv',
];
const inbox = (f: string) => readFileSync(path.join(root, 'inbox', f), 'utf8');

/** The Shopify export with every order total multiplied, so own-site revenue visibly changes. */
const scaledShopify = (k: number) => {
  const [head, ...rows] = inbox('shopify_orders_export.csv').trim().split('\n');
  const cols = head!.split(',');
  const total = cols.indexOf('Total');
  return [
    head,
    ...rows.map((r) =>
      r
        .split(',')
        .map((v, i) => (i === total && v ? String(Number(v) * k) : v))
        .join(','),
    ),
  ].join('\n');
};

async function newCompany(page: Page, name: string) {
  await page.goto('/try');
  await expect(page.getByRole('heading', { level: 1, name: 'Analyse your company' })).toBeVisible();
  await page.getByLabel('Company name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/try\/[^/]+\/manage$/);
}

const ready = (page: Page) => page.getByRole('region', { name: 'Screens ready' });
const revenue = (page: Page) => page.locator('[data-kpi=revenue]').first().locator('div').nth(1);

test('E2E-24 Sandbox: dropped files fill all eight screens, a dropped edit changes the numbers, no API calls', async ({
  page,
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
  });
  await newCompany(page, 'Lumora sandbox');
  await page
    .locator('input[type=file]')
    .setInputFiles([
      path.join(root, 'Drishti-Workspace-Template.xlsx'),
      ...INBOX.map((f) => path.join(root, 'inbox', f)),
    ]);
  await expect(ready(page).locator('li', { hasText: '✓' })).toHaveCount(8, { timeout: 20_000 });
  await expect(page.getByRole('region', { name: 'What Drishti found' })).toContainText('Meta Ads · 636 rows');

  await ready(page)
    .getByRole('link', { name: /Show my screens/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lumora sandbox/ })).toBeVisible();
  for (const s of SCREENS.slice(1)) {
    await page
      .getByRole('navigation', { name: 'Drishti sections' })
      .getByRole('link', { name: s.title, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: s.title })).toBeVisible();
  }
  await page
    .getByRole('navigation', { name: 'Drishti sections' })
    .getByRole('link', { name: 'Performance', exact: true })
    .click();
  const before = await revenue(page).innerText();

  // Update data: the same export again with bigger totals replaces the old file.
  await page.getByRole('button', { name: /Lumora sandbox/ }).click();
  await page.getByRole('menuitem', { name: 'Manage data' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'shopify_orders_export.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(scaledShopify(3)),
  });
  await expect(
    page.getByRole('region', { name: 'Linked sheets and files' }).getByText('shopify_orders_export.csv'),
  ).toHaveCount(1);
  await ready(page)
    .getByRole('link', { name: /Show my screens/ })
    .click();
  await page
    .getByRole('navigation', { name: 'Drishti sections' })
    .getByRole('link', { name: 'Performance', exact: true })
    .click();
  await expect(revenue(page)).not.toHaveText(before);
  expect(api).toEqual([]);
});

test('E2E-27 Sandbox: a linked Google Sheet fills the screens and Refresh fetches it again', async ({ page }) => {
  let k = 1;
  let calls = 0;
  await page.route('**/api/sheet?**', async (route) => {
    calls++;
    const url = new URL(route.request().url()).searchParams.get('url') ?? '';
    if (url.includes('PRIVATE'))
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SHEET_NOT_PUBLIC', message: 'x', request_id: 'r' } }),
      });
    const tabs: Record<string, string> = Object.fromEntries(INBOX.map((f) => [f.replace('.csv', ''), inbox(f)]));
    tabs.shopify_orders_export = scaledShopify(k);
    return route.fulfill({
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      headers: { 'x-sheet-name': encodeURIComponent('Lumora live data') },
      body: makeXlsx(tabs),
    });
  });
  await newCompany(page, 'Lumora linked');

  // A private sheet shows how to share it.
  const link = page.getByLabel('Google Sheets link');
  await link.fill('https://docs.google.com/spreadsheets/d/PRIVATE0123456789abcdefghij/edit');
  await page.getByRole('button', { name: 'Link sheet' }).click();
  await expect(page.getByRole('alert')).toContainText('Anyone with the link');

  await link.fill('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123/edit#gid=0');
  await page.getByRole('button', { name: 'Link sheet' }).click();
  await expect(page.getByRole('region', { name: 'Linked sheets and files' })).toContainText('Lumora live data');
  await expect(ready(page).locator('li', { hasText: '✓' })).toHaveCount(8, { timeout: 20_000 });
  await ready(page)
    .getByRole('link', { name: /Show my screens/ })
    .click();
  await page
    .getByRole('navigation', { name: 'Drishti sections' })
    .getByRole('link', { name: 'Performance', exact: true })
    .click();
  const before = await revenue(page).innerText();

  // The sheet changes in Google; Refresh brings the new numbers.
  k = 4;
  const fetchedBefore = calls;
  await page.getByRole('button', { name: /Refresh/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Updated just now' })).toHaveCount(1);
  expect(calls).toBeGreaterThan(fetchedBefore);
  await expect(revenue(page)).not.toHaveText(before);
});

test('Sandbox pages and an empty screen are accessible and say what to add', async ({ page }) => {
  await newCompany(page, 'Reviews only');
  await page.locator('input[type=file]').setInputFiles(path.join(root, 'inbox', 'reviews_export.csv'));
  await expect(ready(page).locator('li', { hasText: '✓' })).toHaveCount(3, { timeout: 20_000 });
  const scan = async () => {
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    return r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`);
  };
  expect(await scan()).toEqual([]);
  await ready(page)
    .getByRole('link', { name: /Show my screens/ })
    .click();
  await expect(page.getByText('Nothing to show here yet')).toBeVisible();
  await expect(page.getByText(/Add sales/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Drishti sections' })
    .getByRole('link', { name: 'Customer voice', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Customer voice' })).toBeVisible();
  await expect(page.getByText('Nothing to show here yet')).toHaveCount(0);
  await page.goto('/try');
  await expect(page.getByRole('heading', { level: 3, name: 'Reviews only' })).toBeVisible();
  expect(await scan()).toEqual([]);
});
