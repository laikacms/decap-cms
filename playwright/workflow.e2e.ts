import { authedTest as test, expect, gotoRoute } from './fixtures';

/**
 * dev-test/config.yml sets `publish_mode: editorial_workflow`, so the shell
 * exposes the workflow board at #/workflow.
 */
test.describe('Laika editorial workflow', () => {
  test('renders the workflow board with its status columns', async ({ page }) => {
    await gotoRoute(page, '/workflow');

    await expect(page.getByRole('heading', { name: 'Editorial Workflow' })).toBeVisible();

    for (const column of ['Drafts', 'In Review', 'Ready']) {
      await expect(page.getByRole('heading', { name: column, exact: true })).toBeVisible();
    }

    // On the workflow board the create action is a button (it's a link in the
    // collection list view).
    await expect(page.getByRole('button', { name: /New Post/i })).toBeVisible();
  });

  test('is reachable from the header Workflow link', async ({ page }) => {
    await gotoRoute(page, '/');

    await page.getByRole('link', { name: 'Workflow' }).click();

    await expect(page).toHaveURL(/#\/workflow$/);
    await expect(page.getByRole('heading', { name: 'Editorial Workflow' })).toBeVisible();
  });
});
