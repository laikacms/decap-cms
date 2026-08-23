import { expect, test as base } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * Shared Playwright fixtures for the demo e2e suite.
 *
 * `test`        — plain, unauthenticated. Specs navigate to `index.html`, which
 *                 lands on the login screen (the `test-repo` backend still
 *                 requires a click-through "Login").
 * `authedTest`  — seeds the `decap-cms-user` localStorage key via an init
 *                 script (runs at document-start, before the CMS bundle boots)
 *                 so `restoreUser()` resolves immediately and the app renders
 *                 already logged in. Being a fixture rather than a dedicated
 *                 HTML page lets specs deep-link straight to any hash route
 *                 (e.g. `#/collections/posts`) without the redirect hop.
 */

export const CMS_PAGE = '/index.html';

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
 * The collections sidebar — an `<aside aria-label="Collections">`, distinct
 * from the header's own `navigation` region. Scope collection-link
 * assertions to this so they don't match header links.
 *
 * Desktop renders it as a persistent landmark (role `complementary`); a shell
 * that collapses it into a Base UI `Drawer.Popup` at narrow viewports asserts
 * dialog semantics (role `dialog`) regardless of any `render={<aside />}`
 * override. Match either role so this helper works at both viewports.
 */
export function sidebar(page: Page) {
  return page
    .getByRole('complementary', { name: 'Collections' })
    .or(page.getByRole('dialog', { name: 'Collections' }));
}

/**
 * Navigate an authed page to a hash route and wait for the app chrome to be
 * present. Uses the `banner` landmark (the app `<header>`) as the boot signal:
 * it is the one element the shell renders at every viewport and on every
 * route, so it does not couple this helper to any particular header content.
 */
export async function gotoRoute(page: Page, hash = '/'): Promise<void> {
  await page.goto(`${CMS_PAGE}#${hash}`);
  await expect(page.getByRole('banner')).toBeVisible();
}
