import { expect, test } from '@playwright/test';
import { open, SCREENS, strip } from './helpers';

// Demo end-to-end suite (docs/12 §2, E2E-01..12 and E2E-21).

test('E2E-01 /demo loads This week in under 2 s with verdict, six KPIs, bridge, panels, inference and five actions', async ({
  page,
}) => {
  const start = Date.now();
  await page.goto('/demo');
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'What moved sales' })).toBeVisible();
  expect(Date.now() - start).toBeLessThan(2000);
  await expect(strip(page).locator('[data-kpi]')).toHaveCount(6);
  await expect(strip(page)).toContainText(/week/i);
  await expect(page.locator('[data-driver]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'What this means' })).toBeVisible();
  await expect(page.locator('[data-suggestion]')).toHaveCount(5);
});

test('E2E-02 each nav link opens its screen and no page scrolls at 1440 × 900', async ({ page }) => {
  await open(page, '/demo');
  for (const s of SCREENS) {
    await page
      .getByRole('navigation', { name: 'Drishti sections' })
      .getByRole('link', { name: s.title, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: s.title })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${s.path}$`));
    const { h, w } = await page.evaluate(() => ({
      h: document.documentElement.scrollHeight,
      w: document.documentElement.scrollWidth,
    }));
    expect(h, s.title).toBe(900);
    expect(w, s.title).toBe(1440);
  }
});

test('E2E-03 dark mode toggles every screen and persists across reload', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: '☾ Dark' }).click();
  for (const s of SCREENS) {
    await page.goto(s.path);
    await expect(page.locator('.dr-root')).toHaveAttribute('data-theme', 'dark');
    const bg = await page.locator('main').evaluate((m) =>
      getComputedStyle(m.closest('.dr-root') as Element)
        .getPropertyValue('--bg')
        .trim(),
    );
    expect(bg.toLowerCase(), s.title).toBe('#0a0f1f');
  }
  await page.reload();
  await expect(page.locator('.dr-root')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: '☾ Dark' })).toHaveAttribute('aria-pressed', 'true');
});

test('E2E-04 Performance tabs and channel selection update the chart, inference and actions', async ({ page }) => {
  await open(page, '/demo/performance');
  const tabs = page.getByRole('tablist', { name: 'Revenue by channel by week' });
  await tabs.getByRole('tab', { name: 'Orders' }).click();
  await expect(tabs.getByRole('tab', { name: 'Orders' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('img', { name: /^Orders, 12 weeks/ })).toBeVisible();
  const insight = page.locator('section[aria-label^="What this means for"]');
  const before = await insight.innerText();
  await page
    .getByRole('button', { name: /Own site/ })
    .first()
    .click();
  await expect(insight).toContainText('Own site');
  expect(await insight.innerText()).not.toBe(before);
  await expect(page.getByRole('region', { name: 'Suggested actions' })).toContainText('For Own site');
});

test('E2E-05 Impact: selecting Creators shows the under-credited headline', async ({ page }) => {
  await open(page, '/demo/impact');
  await page.getByRole('button', { name: /^Creators/ }).click();
  await expect(page.locator('section[aria-label="What this means for Creators"]')).toContainText('under-credited');
});

test('E2E-06 Market: the map toggle shows the open space; selecting Rival B shows High threat', async ({ page }) => {
  await open(page, '/demo/market');
  await page.getByRole('tab', { name: 'What reviews say' }).click();
  await expect(page.getByTestId('open-space')).toBeVisible();
  await expect(page.getByText(/^Open space:/)).toBeVisible();
  await page.getByRole('tab', { name: 'Price and rating' }).click();
  await page
    .getByRole('region', { name: 'Similar products' })
    .getByRole('button', { name: /^Rival B/ })
    .click();
  await expect(page.locator('section[aria-label="What this means: Rival B"]')).toContainText('High threat');
});

test('E2E-07 Customers: selecting the preferred type highlights it and changes the actions', async ({ page }) => {
  await open(page, '/demo/customers');
  const actions = page.getByRole('region', { name: 'Suggested actions' });
  const before = await actions.innerText();
  const preferred = page.locator('section[aria-label="How each type buys"] button').first();
  const name = (await preferred.innerText()).trim();
  await preferred.click();
  await expect(preferred).toHaveAttribute('aria-pressed', 'true');
  await expect(actions).toContainText(`For ${name}`);
  expect(await actions.innerText()).not.toBe(before);
});

test('E2E-08 Data sources: Flipkart Ads shows 5 days late with its actions; the privacy switch toggles', async ({
  page,
}) => {
  await open(page, '/demo/data');
  await page.getByRole('button', { name: /^Flipkart Ads/ }).click();
  await expect(page.getByRole('button', { name: /^Flipkart Ads/ })).toContainText('5 days late');
  await expect(page.getByRole('region', { name: 'Suggested actions' })).toContainText('Upload the missing reports');
  const toggle = page.getByRole('switch', { name: 'Privacy mode' });
  const was = await toggle.getAttribute('aria-checked');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', was === 'true' ? 'false' : 'true');
});

test('E2E-09 Create coupon: confirm, steps tick, CSV downloads, View in Actions shows it on top', async ({ page }) => {
  await open(page, '/demo');
  const card = page.locator('[data-suggestion="amazon_coupon"]');
  await card.getByRole('button').first().click();
  await card.getByRole('button', { name: 'Create coupon' }).click();
  await expect(card.getByTestId('confirm')).toContainText('This will:');
  await card.getByRole('button', { name: 'Run' }).click();
  await expect(card.getByRole('button', { name: /Working/ })).toBeVisible();
  await expect(card.getByRole('button', { name: "I've done it" })).toBeVisible({ timeout: 5000 });
  const download = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Coupon file (CSV)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^coupon-.*\.csv$/);
  const csv = await (await file.createReadStream())?.toArray();
  expect(Buffer.concat(csv ?? []).toString()).toMatch(
    /^ASIN,Discount type,Discount,Start date,End date,Budget \(INR\),Coupon title/,
  );
  await card.getByRole('button', { name: "I've done it" }).click();
  await expect(card).toContainText('✓ Coupon file ready');
  await card.getByRole('link', { name: 'View in Actions' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Actions' })).toBeVisible();
  const first = page.getByRole('region', { name: 'Action log' }).getByRole('button').first();
  await expect(first).toContainText('Amazon coupon');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
});

test('E2E-10 Budget shift waits for approval; Approve and run on Actions moves it to Running', async ({ page }) => {
  await open(page, '/demo');
  const card = page.locator('[data-suggestion="budget_shift"]');
  await card.getByRole('button').first().click();
  await card.getByRole('button', { name: 'Apply budget shift' }).click();
  await card.getByRole('button', { name: 'Run' }).click();
  await expect(card).toContainText('Waiting for approval from');
  await card.getByRole('link', { name: 'View in Actions' }).click();
  await page.getByRole('button', { name: 'Approve and run' }).click();
  const row = page.getByRole('region', { name: 'Action log' }).getByRole('button').first();
  await expect(row).toContainText('Running');
  await expect(page.getByTestId('did-steps')).toContainText('Approved by');
});

test('E2E-11 Undo on a done action shows Undone and the restore step', async ({ page }) => {
  await open(page, '/demo/actions');
  const cap = page.getByRole('region', { name: 'Action log' }).getByRole('button', { name: /Cap discounts/ });
  await cap.click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(cap).toContainText('Undone');
  await expect(page.getByTestId('did-steps')).toContainText('Restored the previous values');
});

test('E2E-12 Assign opens the owner picker and logs the assignment', async ({ page }) => {
  await open(page, '/demo/impact');
  const actions = page.getByRole('region', { name: 'Suggested actions' });
  await actions.getByRole('button', { name: 'Assign' }).first().click();
  const picker = page.getByTestId('assign-picker');
  await expect(picker).toBeVisible();
  await picker.getByRole('combobox').selectOption({ index: 2 });
  const owner = (await picker.getByRole('combobox').locator('option:checked').innerText()).split(' · ')[0]!;
  await picker.getByRole('button', { name: 'Assign' }).click();
  await expect(page.getByRole('status')).toContainText(`Assigned to ${owner}`);
  await page
    .getByRole('navigation', { name: 'Drishti sections' })
    .getByRole('link', { name: 'Actions', exact: true })
    .click();
  await expect(page.getByRole('region', { name: 'Action log' }).getByRole('button').first()).toContainText(owner);
});

test('E2E-21 Home page: no scroll in both themes; buttons and links go to the right place', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await open(page, '/', { theme });
    const { h, w } = await page.evaluate(() => ({
      h: document.documentElement.scrollHeight,
      w: document.documentElement.scrollWidth,
    }));
    expect(h).toBe(900);
    expect(w).toBe(1440);
  }
  await expect(page.getByRole('link', { name: 'Set up your workspace' })).toHaveAttribute('href', /SETUP-RUNBOOK/);
  await expect(page.getByRole('link', { name: 'What data Drishti needs' })).toHaveAttribute('href', /CONNECTORS/);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download the sample sheet' }).click();
  expect((await download).suggestedFilename()).toBe('Drishti-Workspace-Template.xlsx');
  await page.getByRole('link', { name: 'Open the demo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
});
