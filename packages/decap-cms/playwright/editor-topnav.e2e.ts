import { authedTest as test, expect, gotoRoute } from './fixtures';

/**
 * DCMS-431 — the app-shell top-nav (`Home` brand link, `Media`, `Workflow`)
 * used to stay mounted at y=0-56 underneath the entry editor's own header/
 * toolbar: not `display: none`, not `aria-hidden`, still `tabIndex`-focusable,
 * but visually painted over so every click/`elementFromPoint` at their
 * on-screen position landed on the editor toolbar instead (30s Playwright
 * timeouts on `click Media` etc. from within an editor).
 *
 * The fix unmounts the app-shell header entirely while an editor route
 * (`entryNew` / `entry`) is active, so these specs assert the header nav is
 * gone from the DOM (not just hidden) whenever the editor toolbar is up, and
 * comes back the moment the editor is left.
 */
test.describe('Laika editor route - app top-nav suppression', () => {
  test('opening an existing entry removes the app header, not just covers it', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');

    // Sanity: the app header is present (and its brand "Home" link + "Media"
    // button are real, clickable elements) before entering the editor.
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Media' })).toBeVisible();

    await page.getByRole('link', { name: /This is post #/ }).first().click();
    await expect(page).toHaveURL(/#\/collections\/posts\/entries\//);

    // The editor's own toolbar is up …
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    // … and the app header's nav is gone from the DOM entirely, not present
    // (rather than present-but-invisible/unclickable), so there is nothing
    // left to tab-focus or mis-click into.
    await expect(page.getByRole('link', { name: 'Home' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Media', exact: true })).toHaveCount(0);

    // Leaving the editor restores the header.
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });

  test('the new-entry editor route also removes the app header', async ({ page }) => {
    // Deep-linking straight to `#/collections/posts/new` never renders the
    // header to begin with (that's the fix); reach the route by navigating
    // there from a page that does have it, so the assertion is meaningful.
    await gotoRoute(page, '/collections/posts');
    await page.getByRole('link', { name: /New Post/i }).click();
    await expect(page).toHaveURL(/#\/collections\/posts\/new$/);

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Media', exact: true })).toHaveCount(0);
  });

  test('tabbing from the editor never focuses a removed app-header control', async ({ page }) => {
    await gotoRoute(page, '/collections/posts');
    await page.getByRole('link', { name: /New Post/i }).click();
    await expect(page).toHaveURL(/#\/collections\/posts\/new$/);

    const home = page.getByRole('link', { name: 'Home' });
    const media = page.getByRole('button', { name: 'Media', exact: true });

    // Neither control exists in the accessibility tree while editing, so they
    // cannot pick up focus via Tab (previously: `tabIndex` 0, focus ring on an
    // invisible control, Enter fired its route-change handler mid-edit).
    await expect(home).toHaveCount(0);
    await expect(media).toHaveCount(0);
  });
});
