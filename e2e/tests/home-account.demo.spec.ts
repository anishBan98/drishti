import { expect, test } from '@playwright/test';
import { open } from './helpers';

// The home banner (before Drishti against with Drishti) and the signed-in pages' routing (docs/09 §6.10).
// The banner only moves by itself when the viewer has not asked for reduced motion.
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('the home banner shows each finding as before and after, and its controls work', async ({ page }) => {
  await open(page, '/');
  const banner = page.getByRole('region', { name: 'What changes with Drishti' });
  await banner.getByRole('button', { name: 'Pause the banner' }).click();
  await expect(banner.getByRole('button', { name: 'Resume the banner' })).toHaveAttribute('aria-pressed', 'true');
  for (const [n, tag] of [
    [1, 'Ad returns'],
    [2, 'This week'],
    [3, 'Rivals'],
    [4, 'Customers'],
  ] as const) {
    await banner.getByRole('button', { name: `Show finding ${n} of 4` }).click();
    await expect(banner.getByText(tag, { exact: true })).toBeVisible();
    await expect(banner.getByText('Before Drishti')).toBeVisible();
    await expect(banner.getByText('With Drishti')).toBeVisible();
  }
  // The engine's own verdict is the "with Drishti" side.
  await banner.getByRole('button', { name: 'Show finding 1 of 4' }).click();
  await expect(banner).toContainText('Ads really added');
});

test('the home banner moves on by itself', async ({ page }) => {
  await open(page, '/');
  const banner = page.getByRole('region', { name: 'What changes with Drishti' });
  await expect(banner.getByRole('button', { name: 'Show finding 1 of 4' })).toHaveAttribute('aria-current', 'true');
  await page.mouse.move(0, 0);
  await expect(banner.getByRole('button', { name: 'Show finding 2 of 4' })).toHaveAttribute('aria-current', 'true', {
    timeout: 8000,
  });
});

test('signed-out visits to workspace pages go to Sign in, and the home page links there', async ({ page }) => {
  for (const path of ['/app', '/onboarding', '/admin']) {
    await open(page, path);
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to your workspace' })).toBeVisible();
  }
  await open(page, '/');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/signin$/);
});
