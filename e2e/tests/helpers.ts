import { expect, type Page } from '@playwright/test';

export const SCREENS = [
  { path: '/demo', title: 'This week' },
  { path: '/demo/actions', title: 'Actions' },
  { path: '/demo/performance', title: 'Performance' },
  { path: '/demo/impact', title: 'Impact and ROI' },
  { path: '/demo/market', title: 'Market' },
  { path: '/demo/customers', title: 'Customers' },
  { path: '/demo/voice', title: 'Customer voice' },
  { path: '/demo/data', title: 'Data sources' },
] as const;

/** Opens a screen with a fresh demo tab (no actions from earlier tests) and waits for data and fonts. */
export async function open(page: Page, path: string, opts: { theme?: 'light' | 'dark' } = {}) {
  await page.addInitScript((theme) => {
    if (theme) localStorage.setItem('drishti-theme', theme);
  }, opts.theme);
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

export const strip = (page: Page) => page.getByRole('region', { name: 'Summary' });
