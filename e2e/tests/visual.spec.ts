import { expect, test } from '@playwright/test';
import { open } from './helpers';

// Visual regression (docs/12 §5): each screen in both themes, rendered from the design fixture
// (?fixture=design loads e2e/fixtures/design-snapshot.json), compared with design/screens/<nn>-<screen>-<theme>.png.
// Baselines are the design PNGs; update them only on purpose (pnpm test:visual --update-snapshots, reviewed PR).
const SHOTS = [
  ['/demo', '01-this-week'],
  ['/demo/actions', '02-actions'],
  ['/demo/performance', '03-performance'],
  ['/demo/impact', '04-impact-roi'],
  ['/demo/market', '05-market'],
  ['/demo/customers', '06-customers'],
  ['/demo/voice', '07-customer-voice'],
  ['/demo/data', '08-data-sources'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const [path, name] of SHOTS) {
    test(`visual ${name} (${theme})`, async ({ page }) => {
      await open(page, `${path}?fixture=design`, { theme });
      await page.mouse.move(0, 899);
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
        caret: 'hide',
      });
    });
  }
}
