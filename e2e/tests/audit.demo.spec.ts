import { expect, test } from '@playwright/test';
import { open } from './helpers';

// Regressions from the M3 UI audit: happy and unhappy paths found by hand on the running app.

test('an action that was mid-run when the page reloaded picks up where it left off', async ({ page }) => {
  await open(page, '/demo');
  const restock = page.locator('[data-suggestion=restock_request]');
  await restock.getByRole('button', { name: 'Send restock request' }).click();
  await restock.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(restock.getByRole('button', { name: /Working/ })).toBeVisible();
  await page.reload();
  await expect(restock.getByTestId('done')).toContainText('Restock request sent', { timeout: 5000 });
});

test('if the demo data fails to load, the demo says so and Retry recovers', async ({ page }) => {
  let fail = true;
  await page.route('**/demo/snapshot.json', (r) => (fail ? r.fulfill({ status: 500, body: '' }) : r.continue()));
  await page.goto('/demo');
  await expect(page.getByRole('alert')).toContainText("Couldn't load the demo data");
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
});

test('if the demo data fails to load, the home game offers Retry instead of loading forever', async ({ page }) => {
  let fail = true;
  await page.route('**/demo/snapshot.json', (r) => (fail ? r.fulfill({ status: 500, body: '' }) : r.continue()));
  await page.goto('/');
  const game = page.getByRole('region', { name: 'Spot the real rupee' });
  await expect(game.getByRole('alert')).toBeVisible();
  fail = false;
  await game.getByRole('button', { name: /Retry/ }).click();
  await expect(game.getByRole('button', { name: /Play/ })).toBeEnabled();
});

test('Assign needs a due date from today, skips Viewers, and keeps the action runnable', async ({ page }) => {
  await open(page, '/demo/actions');
  const runKpi = page.locator('[data-kpi=run]');
  const before = await runKpi.innerText();
  await page.getByRole('link', { name: 'This week', exact: true }).click();
  const card = page.locator('[data-suggestion=restock_request]');
  await card.getByRole('button', { name: 'Assign' }).click();
  const picker = page.getByTestId('assign-picker');
  await expect(picker.getByRole('combobox')).toBeFocused();
  await expect(picker.locator('option', { hasText: 'Viewer' })).toHaveCount(0);
  const date = picker.locator('input[type=date]');
  await date.fill('');
  await expect(picker.getByRole('button', { name: 'Save' })).toBeDisabled();
  await date.fill('2020-01-01');
  await expect(picker.getByRole('button', { name: 'Save' })).toBeDisabled();
  await date.fill(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
  await picker.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText(/Assigned to \w+, due \d{1,2} [A-Z][a-z]{2}/);
  await expect(card.getByRole('button', { name: 'Send restock request' })).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Action log' }).getByRole('button').first()).toContainText('Assigned');
  expect(await runKpi.innerText()).toBe(before);
});

test('keyboard: g then a number jumps to a screen, not while typing; focus follows the action card', async ({
  page,
}) => {
  await open(page, '/demo');
  await page.keyboard.press('g');
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { level: 1, name: 'Performance' })).toBeVisible();
  await page.keyboard.press('g');
  await page.keyboard.press('1');
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
  const card = page.locator('[data-suggestion=restock_request]');
  await card.getByRole('button', { name: 'Send restock request' }).click();
  await expect(card.getByRole('button', { name: 'Run', exact: true })).toBeFocused();
  await expect(card).toContainText(/At stake: ₹[\d.]+ L\/wk/);
  await card.getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByRole('button', { name: 'Send restock request' })).toBeFocused();
  await card.getByRole('button', { name: 'Assign' }).click();
  await page.locator('input[type=date]').focus();
  await page.keyboard.press('g');
  await page.keyboard.press('3');
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
});

test('a mistyped demo link opens the demo, not the home page', async ({ page }) => {
  await page.goto('/demo/nope');
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible();
});

test('the home game marks a wrong answer as missed, not done', async ({ page }) => {
  await open(page, '/');
  const game = page.getByRole('region', { name: 'Spot the real rupee' });
  await game.getByRole('button', { name: /Play/ }).click();
  await game.locator('button[aria-pressed]').filter({ hasNotText: '₹2.17' }).first().click();
  await expect(game.getByRole('status')).toContainText('Not quite');
  await expect(game.locator('[class*=pipMiss]')).toHaveCount(1);
  await expect(game.locator('[class*=pipDone]')).toHaveCount(0);
});

test.describe('small and sideways phones', () => {
  test.use({ isMobile: true, hasTouch: true });
  for (const [w, h] of [
    [320, 568],
    [844, 390],
  ] as const) {
    test(`home fits ${w} × ${h} with Play on screen`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await open(page, '/');
      const fits = await page.evaluate(() => [
        document.documentElement.scrollWidth <= innerWidth,
        document.documentElement.scrollHeight <= innerHeight,
      ]);
      expect(fits).toEqual([true, true]);
      await expect(page.getByRole('button', { name: /Play/ })).toBeInViewport({ ratio: 1 });
    });
  }

  test('the demo on a phone says it is best on a laptop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/demo');
    await expect(page.getByText(/best on a laptop or desktop/)).toBeVisible();
  });
});

test('the logo in the demo goes back to the home page', async ({ page }) => {
  await open(page, '/demo/market');
  await page.getByRole('link', { name: /home page/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /See what really worked/ })).toBeVisible();
});
