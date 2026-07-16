import { authedTest as test, expect, gotoRoute, sidebar } from './fixtures';

/**
 * Runs only under the `mobile` project (Pixel 7 viewport), where the sidebar
 * collapses behind a hamburger toggle.
 */
test.describe('Laika mobile shell', () => {
  test('hamburger opens and closes the sidebar', async ({ page }) => {
    await gotoRoute(page, '/');

    await expect(page.getByLabel('Open menu')).toBeVisible();

    await page.getByLabel('Open menu').click();
    await expect(page.getByLabel('Close menu')).toBeVisible();
    await expect(sidebar(page).getByRole('link', { name: 'Posts', exact: true })).toBeVisible();

    await page.getByLabel('Close menu').click();
    await expect(page.getByLabel('Open menu')).toBeVisible();
  });
});
