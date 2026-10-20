import { defineConfig, devices } from '@playwright/test';

// End-to-end suites (docs/12 §1, §5). The demo needs no API, so they run against the built SPA served statically:
// the same apps/web/dist the Worker serves. Build first: pnpm build.
const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.DRISHTI_URL ?? `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    // Decorative motion off: elements are stable for clicks and screenshots, and the reduced-motion path is tested.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'demo',
      testMatch: /demo\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // The sandbox parses real files in a worker; it runs on its own so it doesn't slow the other suites.
      name: 'sandbox',
      testMatch: /sandbox.spec.ts/,
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'a11y',
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      // The design PNGs are the baselines (docs/12 §5).
      snapshotPathTemplate: '../design/screens/{arg}{ext}',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.DRISHTI_URL
    ? undefined
    : {
        command: `pnpm --dir ../apps/web exec vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}/demo`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
