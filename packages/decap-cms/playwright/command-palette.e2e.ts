import { authedTest as test, expect, gotoRoute } from './fixtures';

test.describe('Laika command palette', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByLabel('Command palette').first()).toBeVisible();
  });

  test('filters results as you type', async ({ page }) => {
    await page.keyboard.type('Posts');

    await expect(page.getByRole('option', { name: /^Posts/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Search all collections/i })).toBeVisible();
  });

  test('selecting a collection navigates to it', async ({ page }) => {
    await page.keyboard.type('Posts');
    await page.getByRole('option', { name: /^Posts/ }).click();

    await expect(page).toHaveURL(/#\/collections\/posts/);
    await expect(page.getByLabel('Command palette')).toHaveCount(0);
  });

  test('Escape dismisses the palette', async ({ page }) => {
    await page.keyboard.press('Escape');

    await expect(page.getByLabel('Command palette')).toHaveCount(0);
  });
});
