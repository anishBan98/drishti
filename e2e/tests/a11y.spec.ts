import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open, SCREENS } from './helpers';

// Accessibility (docs/09 §8, docs/12 §1): WCAG 2.2 AA rules, every screen and the home page, both themes.
const PAGES = [{ path: '/', title: 'Home' }, ...SCREENS];

for (const theme of ['light', 'dark'] as const) {
  for (const p of PAGES) {
    test(`a11y ${p.title} (${theme})`, async ({ page }) => {
      await open(page, p.path, { theme });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const summary = results.violations.map(
        (v) =>
          `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')} — ${v.nodes[0]?.failureSummary?.split('\n')[1] ?? ''}`,
      );
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
}
