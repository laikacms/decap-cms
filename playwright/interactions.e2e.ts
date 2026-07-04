import { authedTest as test, expect, gotoRoute } from './fixtures';

test.describe('Laika interactions', () => {
  test('theme toggle flips between light and dark', async ({ page }) => {
    await gotoRoute(page, '/');

    const toggle = page.getByLabel(/Switch to (light|dark) mode/);
    const initialLabel = await toggle.getAttribute('aria-label');

    await toggle.click();

    // The button's accessible label reflects the *next* action, so it flips.
    const flipped =
      initialLabel === 'Switch to dark mode' ? 'Switch to light mode' : 'Switch to dark mode';
    await expect(page.getByLabel(flipped)).toBeVisible();
  });

  test('command palette opens with the keyboard shortcut', async ({ page }) => {
    await gotoRoute(page, '/');

    // ControlOrMeta => Cmd on macOS, Ctrl elsewhere (CI/Linux).
    await page.keyboard.press('ControlOrMeta+k');

    await expect(page.getByLabel('Command palette').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Command palette')).toHaveCount(0);
  });
});
