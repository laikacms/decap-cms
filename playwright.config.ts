import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end tests for the Laika shell (`src/laika-app`).
 *
 * These drive the real IIFE bundle exactly as a consumer would: the
 * `laika-cms.js` build is dropped into `dev-test/laika.html` and served as a
 * static page, backed entirely by the in-memory `test-repo` backend (no
 * network, no real git). See `dev-test/config.yml` + `dev-test/repo-fixtures.js`
 * for the seeded content.
 *
 * The `webServer` block builds the laika demo bundle and serves `dev-test/`
 * on :5174 — the same command pair used by `pnpm build:laika-demo` +
 * `pnpm serve:dev-test`. Run with `pnpm test:e2e`.
 */

const PORT = 5174;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './playwright',
  // Only *.e2e.ts here so Playwright never tries to run the vitest `*.spec.tsx`
  // component tests under `src/laika-app/__tests__`.
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Mobile-only specs assert on the collapsed-drawer chrome, which doesn't
      // exist at desktop widths.
      testIgnore: /.*\.mobile\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /.*\.mobile\.e2e\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Build the laika IIFE bundle into dev-test/dist, then serve dev-test/.
    // The `&&` keeps `serve` as the long-lived foreground process Playwright
    // waits on.
    command: 'pnpm run build:laika-demo && npx --yes serve dev-test -l ' + PORT,
    url: `${baseURL}/config.yml`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
