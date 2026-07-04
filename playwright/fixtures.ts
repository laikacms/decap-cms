import { test as base, expect } from '@playwright/test';

/**
 * Shared Playwright fixtures for the Laika e2e suite.
 *
 * `test`        — plain, unauthenticated. Loads `laika.html` to the login
 *                 screen (the `test-repo` backend still requires a click-through
 *                 "Login").
 * `authedTest`  — seeds the `decap-cms-user` localStorage key via an init
 *                 script (runs at document-start, before the CMS bundle boots)
 *                 so `restoreUser()` resolves immediately and the shell renders
 *                 already logged in. Mirrors what `dev-test/laika-authed.html`
 *                 does, but as a fixture so specs can deep-link straight to any
 *                 hash route (e.g. `#/collections/posts`) without the redirect
 *                 hop.
 */

export const LAIKA_PAGE = '/laika.html';

/** The seeded in-memory user; `test-repo` accepts any restored identity. */
const TEST_USER = { backendName: 'test-repo', name: 'Alice', login: 'alice' };

export { expect };

export const test = base;

export const authedTest = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(user => {
      localStorage.setItem('decap-cms-user', JSON.stringify(user));
    }, TEST_USER);
    await use(page);
  },
});

/**
 * The collections sidebar — an `<aside aria-label="Collections">` (role
 * `complementary`), distinct from the header's own `navigation` region. Scope
 * collection-link assertions to this so they don't match header links.
 */
export function sidebar(page: import('@playwright/test').Page) {
  return page.getByRole('complementary', { name: 'Collections' });
}

/**
 * Navigate an authed page to a Laika hash route and wait for the shell chrome
 * to be present. Uses the header brand "Home" link as the boot signal because
 * it stays visible at every viewport (the sidebar collapses on mobile).
 */
export async function gotoRoute(
  page: import('@playwright/test').Page,
  hash = '/',
): Promise<void> {
  await page.goto(`${LAIKA_PAGE}#${hash}`);
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
}
