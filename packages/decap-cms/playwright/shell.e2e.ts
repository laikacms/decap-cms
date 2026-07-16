import { authedTest, expect, gotoRoute, LAIKA_PAGE, sidebar, test } from './fixtures';

test.describe('Laika shell - unauthenticated', () => {
  test('renders the login screen', async ({ page }) => {
    await page.goto(LAIKA_PAGE);

    await expect(page.getByRole('heading', { name: 'Content Manager' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go back to site/i })).toBeVisible();
  });

  test('logging in reveals the app shell', async ({ page }) => {
    await page.goto(LAIKA_PAGE);

    await page.getByRole('button', { name: 'Login' }).click();

    // The test-repo backend logs in instantly; the dashboard replaces the
    // login screen with the collections sidebar + welcome view.
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toHaveCount(0);
  });
});

authedTest.describe('Laika shell - authenticated chrome', () => {
  authedTest.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/');
  });

  authedTest('renders header, sidebar collections, and dashboard', async ({ page }) => {
    // Header actions.
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Media' })).toBeVisible();

    // Sidebar collections (seeded in dev-test/config.yml).
    const nav = sidebar(page);
    for (const label of ['Posts', 'Restaurants', 'FAQ', 'Kitchen Sink', 'Pages']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    // Dashboard landing view.
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(page.getByText('Pick a collection to start editing.')).toBeVisible();
  });
});
