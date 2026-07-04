import { authedTest as test, expect, gotoRoute } from './fixtures';

test.describe('Laika entry editor', () => {
  test('opens an entry and exposes editable fields', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');

    await page.getByRole('link', { name: /This is post #/ }).first().click();

    await expect(page).toHaveURL(/#\/collections\/posts\/entries\//);

    // The title widget is a labelled text input pre-filled from the entry.
    const title = page.getByLabel('Title').first();
    await expect(title).toBeVisible();
    await expect(title).toHaveValue(/This is post #/);

    // Field is editable.
    await title.fill('Edited by Playwright');
    await expect(title).toHaveValue('Edited by Playwright');

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('back control returns to the collection list', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');
    await page.getByRole('link', { name: /This is post #/ }).first().click();
    await expect(page).toHaveURL(/\/entries\//);

    // `exact` so this doesn't match the "Test Backend ↗" header link.
    await page.getByRole('link', { name: 'Back', exact: true }).click();

    await expect(page).toHaveURL(/#\/collections\/posts$/);
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
  });

  test('saving a blank new entry surfaces a validation notice', async ({ page }) => {
    await gotoRoute(page, '/collections/posts/new');

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('region', { name: /notification/i })).toContainText(
      /missed a required field/i,
    );
  });
});
