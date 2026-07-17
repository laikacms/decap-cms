import { authedTest as test, expect, gotoRoute } from './fixtures';

test.describe('Laika collection controls', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/collections/posts');
  });

  test('lists entries with a create action', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Post/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /This is post #/ })).not.toHaveCount(0);
  });

  test('sort menu offers the configured sortable fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sort by' }).click();

    for (const field of ['Title', 'Publish Date', 'Draft']) {
      await expect(page.getByRole('menuitem', { name: field })).toBeVisible();
    }
  });

  test('filter menu offers the configured view filters', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by' }).click();

    // Filter entries are checkable, so Base UI exposes them as
    // menuitemcheckbox rather than plain menuitem.
    for (const filter of ['Posts With Index', 'Posts Without Index', 'Drafts']) {
      await expect(page.getByRole('menuitemcheckbox', { name: filter })).toBeVisible();
    }
  });

  test('group menu offers the configured view groups', async ({ page }) => {
    await page.getByRole('button', { name: 'Group by' }).click();

    for (const group of ['Year']) {
      await expect(page.getByRole('menuitem', { name: group })).toBeVisible();
    }

    // Guard against the duplicate Drafts view_groups fixture entry (DCMS-812)
    // reappearing: dev-test/config.yml intentionally has only one view group.
    await expect(page.getByRole('menuitem', { name: 'Drafts' })).not.toBeVisible();
  });

  test('New Post opens the create form', async ({ page }) => {
    await page.getByRole('link', { name: /New Post/i }).click();

    await expect(page).toHaveURL(/#\/collections\/posts\/new$/);
    await expect(page.getByLabel('Title').first()).toBeVisible();
  });
});
