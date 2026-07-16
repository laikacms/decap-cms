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
      // exist at desktop widths. Backend replay specs run in their own project.
      testIgnore: [/.*\.mobile\.e2e\.ts/, /backends\//],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Recorded-backend editorial workflow specs: drive the classic
      // `decap-cms.js` bundle against replayed API fixtures from
      // `cypress/fixtures/` (see playwright/backends/replay.ts). The 1200px
      // viewport matches what the recordings were captured under.
      name: 'github-backend',
      testMatch: /backends\/.*\.e2e\.ts/,
      timeout: 90_000,
      // Replay tests are cheap and deterministic in isolation but can flake
      // under full-suite browser contention; one retry absorbs that.
      retries: 1,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 1200 } },
    },
    {
      name: 'mobile',
      testMatch: /.*\.mobile\.e2e\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Build the laika + classic IIFE bundles into dev-test/dist, then serve
    // dev-test/. (The classic decap-cms.js bundle is what the backend replay
    // specs drive.) The `&&` keeps `serve` as the long-lived foreground
    // process Playwright waits on.
    // DEMO_NODE_ENV=production: the replay fixtures predate StrictMode, whose
    // dev-only double-invoked effects desync the consume-once replay (see
    // playwright/backends/replay.ts).
    command:
      'pnpm run build:laika-demo && DEMO_NODE_ENV=production pnpm run build:demo && DEMO_NODE_ENV=production pnpm run build:demo-graphql && npx --yes serve dev-test -l '
      + PORT,
    url: `${baseURL}/config.yml`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
