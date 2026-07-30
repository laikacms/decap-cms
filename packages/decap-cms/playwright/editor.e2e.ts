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
    // Deep-linking straight to `/collections/posts/new` via `gotoRoute` never
    // works: per DCMS-431 the app-shell header (including the "Home" link
    // `gotoRoute` waits on as its boot signal) is unmounted while an editor
    // route is active, even on direct deep-link. Reach the route the same
    // way `editor-topnav.e2e.ts` does — navigate to the collection list
    // first (where the header is present) and click through.
    await gotoRoute(page, '/collections/posts');
    await page.getByRole('link', { name: /New Post/i }).click();
    await expect(page).toHaveURL(/#\/collections\/posts\/new$/);

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('region', { name: /notification/i })).toContainText(
      /missed a required field/i,
    );
  });

  test('rapid double-click on Save does not surface a bogus required-field error (DCMS-1763)', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');
    await page.getByRole('link', { name: /This is post #/ }).first().click();
    await expect(page).toHaveURL(/#\/collections\/posts\/entries\//);

    // Fully-populated existing entry: touch and revert the title (so the
    // entry is dirty and Save is enabled) without touching the richtext
    // body, matching the original repro exactly - the body widget already
    // has content and is never edited in this flow.
    const title = page.getByLabel('Title').first();
    await expect(title).toBeVisible();
    const original = await title.inputValue();
    await title.fill(`${original} EDIT`);
    await title.fill(original);

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled();

    // The exact repro from DCMS-1763: rapid double-click with a short delay.
    await saveButton.click({ clickCount: 2, delay: 30 });

    // Let any spurious validation notification/banner have time to appear.
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toContainText(/is required/i);
    await expect(page.locator('body')).not.toContainText(/missed a required field/i);
  });
});
