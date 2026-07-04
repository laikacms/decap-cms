import { authedTest as test, expect, gotoRoute, sidebar } from './fixtures';

test.describe('Laika navigation', () => {
  test('sidebar link opens a collection entry list', async ({ page }) => {
    await gotoRoute(page, '/');

    await sidebar(page).getByRole('link', { name: 'Posts', exact: true }).click();

    await expect(page).toHaveURL(/#\/collections\/posts$/);
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Post/i })).toBeVisible();

    // The seeded repo fixture yields a list of post entries.
    await expect(page.getByRole('link', { name: /This is post #/ }).first()).toBeVisible();
  });

  test('deep-links straight to a collection route', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');

    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Post/i })).toBeVisible();
  });

  test('settings route renders its sections', async ({ page }) => {
    await gotoRoute(page, '/settings');

    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Backend' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  });
});
