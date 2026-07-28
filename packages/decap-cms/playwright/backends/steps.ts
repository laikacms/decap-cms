import { expect, test as base } from '@playwright/test';

import { installReplay, serveAppBundle } from './replay';

import type { Page } from '@playwright/test';
import type { ReplayHandle } from './replay';

/**
 * Playwright port of the recorded-backend editorial workflow suite from the
 * retired Cypress e2e setup.
 *
 * Tests replay recorded API fixtures (see `./replay.ts`), so they run fully
 * offline against the classic `decap-cms.js` bundle. Two environmental
 * details are load-bearing:
 *
 *  - `Date` is pinned to epoch 0 (`page.clock.setFixedTime`), matching the
 *    `cy.clock(0, ['Date'])` the recordings were made under — entry slugs
 *    (`1970-01-01-first-title`) and branch names are derived from it, and the
 *    recorded request bodies/URLs only match when it's frozen. Timers keep
 *    running; `advanceClock` bumps the fixed time so debounced inputs flush.
 *  - dialogs: the "load local backup?" confirm is dismissed, everything else
 *    (publish/delete confirms) is accepted.
 *  - the "load local backup?" prompt is still a native `window.confirm`, so
 *    it's handled by the `page.on('dialog', ...)` handler below. All other
 *    confirms (delete/publish/leave-page) go through the `AlertDialog`
 *    component (DCMS-658) instead of `window.confirm`, so they render a real
 *    DOM modal and must be dismissed with `confirmAlertDialog`/
 *    `confirmAlertDialogIfPresent` rather than relying on the dialog handler.
 */

export const workflowStatus = { draft: 'Drafts', review: 'In Review', ready: 'Ready' } as const;
export const editorStatus = { draft: 'Draft', review: 'In review', ready: 'Ready' } as const;

export const notifications = {
  saved: 'Entry saved',
  published: 'Entry published',
  updated: 'Entry status updated',
  deletedUnpublished: 'Unpublished changes deleted',
} as const;

const CONFIRM_LOAD_BACKUP = 'A local backup was recovered for this entry, would you like to use it?';

export interface Entry {
  title: string;
  [field: string]: string;
}

interface BackendTestOptions {
  /** Seeded `decap-cms-user` localStorage value; skips the login screen. */
  backendUser: Record<string, unknown> | null;
  /** The dev-test page for the backend under test. */
  backendPage: string;
  /**
   * Seeded `netlifySiteURL` localStorage value (git-gateway only) — switches
   * the auth page to the email/password Identity form, whose requests the
   * fixtures cover. Use `loginNetlify` instead of `login` with this.
   */
  netlifySiteURL: string | null;
}

const fixedTime = new WeakMap<Page, number>();

export const test = base.extend<BackendTestOptions & { replay: ReplayHandle }>({
  backendUser: [null, { option: true }],
  // Trailing slash matters: the `serve` static server redirects
  // `/index.html` to the clean URL, which would break the page's relative
  // `dist/decap-cms.js` reference.
  backendPage: ['/backends/github/', { option: true }],
  netlifySiteURL: [null, { option: true }],

  replay: async ({ page, backendUser, netlifySiteURL }, use, testInfo) => {
    // Fixture files are named `<describe title>__<test title>.json`, exactly
    // how the Cypress suite derived them — so the recordings are shared as-is.
    const fixtureName = testInfo.titlePath.slice(1).join('__');

    fixedTime.set(page, 0);
    await page.clock.setFixedTime(0);

    page.on('dialog', dialog => {
      if (dialog.message() === CONFIRM_LOAD_BACKUP) {
        void dialog.dismiss();
      } else {
        void dialog.accept();
      }
    });

    if (backendUser) {
      await page.addInitScript(user => {
        window.localStorage.setItem('decap-cms-user', JSON.stringify(user));
      }, backendUser);
    }
    if (netlifySiteURL) {
      await page.addInitScript(url => {
        window.localStorage.setItem('netlifySiteURL', url);
      }, netlifySiteURL);
    }

    await serveAppBundle(page);
    const handle = await installReplay(page, fixtureName);
    await use(handle);
  },
});

export { expect };

/**
 * Bump the frozen clock and give real timers a beat — the equivalent of the
 * Cypress `advanceClock` tick+wait, needed before Save because some inputs
 * debounce against `Date.now()`.
 */
export async function advanceClock(page: Page): Promise<void> {
  const time = (fixedTime.get(page) ?? 0) + 1000;
  fixedTime.set(page, time);
  await page.clock.setFixedTime(time);
  await page.waitForTimeout(600);
}

export async function login(page: Page, pageUrl: string): Promise<void> {
  await page.goto(pageUrl);
  await expect(page.getByRole('link', { name: 'New Post' })).toBeVisible({ timeout: 30_000 });
}

/** Git-gateway login via the Netlify Identity email/password form. */
export async function loginNetlify(
  page: Page,
  pageUrl: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(pageUrl);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'New Post' })).toBeVisible({ timeout: 30_000 });
}

export async function assertNotification(page: Page, message: string): Promise<void> {
  const toast = page.locator('.notif__container').getByText(message).first();
  await expect(toast).toBeVisible();
  // Actually dismiss it (click-to-close) rather than just hiding the element:
  // identical notifications are deduped while one is still active (DCMS-447),
  // so a hidden-but-active toast would swallow the next assertion's toast.
  await toast.click();
  await expect(toast).toBeHidden();
}

export async function newPost(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'New Post' }).click({ force: true });
}

export async function populateEntry(
  page: Page,
  entry: Entry,
  onDone: (page: Page) => Promise<void> = flushClockAndSave,
): Promise<void> {
  for (const [key, value] of Object.entries(entry)) {
    if (!value) continue;
    await page.locator(`[id^="${key}-field"]`).first().fill(value, { force: true });
  }
  await onDone(page);
}

export async function flushClockAndSave(page: Page): Promise<void> {
  await advanceClock(page);
  await page.getByRole('button', { name: 'Save' }).click();
}

export async function createPost(page: Page, entry: Entry): Promise<void> {
  await newPost(page);
  await populateEntry(page, entry);
}

/**
 * Clicks OK on the `AlertDialog`-backed confirm (DCMS-658) that replaced
 * `window.confirm` at most call sites — delete/publish/leave-page prompts
 * all render this real DOM modal rather than a native dialog, so Playwright's
 * `page.on('dialog', ...)` auto-accept handler never sees them.
 */
export async function confirmAlertDialog(page: Page, name = 'Confirm'): Promise<void> {
  await page.getByRole('alertdialog', { name }).getByRole('button', { name: 'OK' }).click();
}

/**
 * Same as {@link confirmAlertDialog}, but for confirms that only appear
 * conditionally (e.g. the leave-page guard only fires when there are unsaved
 * changes) — waits briefly for the dialog and no-ops if it never shows up.
 */
export async function confirmAlertDialogIfPresent(page: Page, name = 'Confirm'): Promise<void> {
  const dialog = page.getByRole('alertdialog', { name });
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2_000 });
  } catch {
    return;
  }
  await dialog.getByRole('button', { name: 'OK' }).click();
}

export async function exitEditor(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Writing in' }).click();
  // Leaving the editor may trigger the unsaved-changes leave-page confirm
  // (useNavigationBlocker.ts, DCMS-658's AlertDialog migration) — only when
  // there are actually unsaved changes, so this is a no-op otherwise.
  await confirmAlertDialogIfPresent(page);
}

export async function createPostAndExit(page: Page, entry: Entry): Promise<void> {
  await createPost(page, entry);
  await advanceClock(page);
  await exitEditor(page);
}

export async function goToWorkflow(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Workflow' }).click();
}

export async function goToCollections(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Content' }).click();
}

/** The workflow board column containing the given `h2` heading. */
function workflowColumn(page: Page, heading: string) {
  return page.locator(`//h2[contains(., "${heading}")]/..`);
}

export async function updateWorkflowStatus(
  page: Page,
  { title }: Entry,
  fromColumnHeading: string,
  toColumnHeading: string,
): Promise<void> {
  const card = workflowColumn(page, fromColumnHeading).locator(`a:has-text("${title}")`).first();
  const target = workflowColumn(page, toColumnHeading);

  // react-dnd's HTML5 backend listens for native drag events; dispatching
  // dragstart/drop with a shared DataTransfer replicates a user drag (the
  // same trick the Cypress `drag`/`drop` commands used).
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });

  await assertNotification(page, notifications.updated);
}

export async function publishWorkflowEntry(page: Page, { title }: Entry): Promise<void> {
  const card = workflowColumn(page, workflowStatus.ready)
    .locator(`a:has-text("${title}")`)
    .first()
    .locator('xpath=..');
  await card.getByRole('button', { name: 'Publish new entry' }).click({ force: true });
  // Publish confirm is the AlertDialog-backed confirm (DCMS-658), not a
  // native dialog — must be dismissed explicitly.
  await confirmAlertDialog(page);
}

export async function updateExistingPostAndExit(
  page: Page,
  fromEntry: Entry,
  toEntry: Entry,
): Promise<void> {
  await goToWorkflow(page);
  await page.locator(`a:has-text("${fromEntry.title}")`).first().click({ force: true });
  // Wait for the editor to hydrate with the existing entry before typing —
  // values filled during hydration get overwritten by the loaded entry.
  await expect(page.locator('[id^="title-field"]').first()).toHaveValue(fromEntry.title);
  await populateEntry(page, toEntry);
  await exitEditor(page);
  await goToWorkflow(page);
  await expect(page.locator(`h2:has-text("${toEntry.title}")`).first()).toBeVisible();
}

export async function assertWorkflowStatus(
  page: Page,
  { title }: Entry,
  status: string,
): Promise<void> {
  await expect(
    workflowColumn(page, status).locator(`a:has-text("${title}")`).first(),
  ).toBeVisible();
}

export async function assertPublishedEntry(page: Page, entries: Entry[]): Promise<void> {
  const titles = [...entries].reverse().map(entry => entry.title);
  const headings = page.locator('a h2');
  for (const [index, title] of titles.entries()) {
    await expect(headings.nth(index)).toContainText(title);
  }
}

export async function deleteEntryInEditor(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Delete' }).first().click();
  // Delete confirm is the AlertDialog-backed confirm (DCMS-658), not a
  // native dialog — must be dismissed explicitly.
  await confirmAlertDialog(page);
  await assertNotification(page, notifications.deletedUnpublished);
}

export async function assertOnCollectionsPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/#\/collections\/posts/);
}

export async function assertEntryDeleted(page: Page, { title }: Entry): Promise<void> {
  await expect(page.locator(`a h2:has-text("${title}")`)).toHaveCount(0);
}

const STATUS_BUTTON_TEXT = 'Status:';

/**
 * Open a toolbar dropdown and pick an item. Locates by accessible role so it
 * works for both native-button triggers (Base UI) and `role="button"` divs
 * (react-aria-menubutton), and finds the menu globally because Base UI
 * portals the popup out of the trigger's subtree.
 *
 * `itemRole` defaults to `menuitem` (independent-action items, e.g. Publish)
 * but the workflow-status dropdown uses Base UI's `Menu.RadioGroup`, whose
 * options expose `role="menuitemradio"` (see #1472).
 */
async function selectDropdownItem(
  page: Page,
  label: string,
  item: string,
  itemRole: 'menuitem' | 'menuitemradio' = 'menuitem',
): Promise<void> {
  await page.getByRole('button', { name: label }).first().click();
  await page.getByRole('menu').getByRole(itemRole, { name: item }).first().click();
}

export async function updateWorkflowStatusInEditor(page: Page, newStatus: string): Promise<void> {
  await selectDropdownItem(page, STATUS_BUTTON_TEXT, newStatus, 'menuitemradio');
  await assertNotification(page, notifications.updated);
}

export async function assertWorkflowStatusInEditor(page: Page, status: string): Promise<void> {
  await page.getByRole('button', { name: STATUS_BUTTON_TEXT }).first().click();
  // The active status menu item carries a checkmark svg. The status options
  // are a Base UI Menu.RadioGroup, so they expose role="menuitemradio", not
  // the plain "menuitem" role used by independent-action dropdowns (#1472).
  await expect(
    page.getByRole('menu').getByRole('menuitemradio', { name: status }).first().locator('svg').first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
}
