import { authedTest as test, expect, gotoRoute } from './fixtures';

import type { Page } from '@playwright/test';

/**
 * Pointer/focus regressions in the richtext (Lexical) editor.
 *
 * Regression suite for three coupled bugs (reported together as "the editor
 * jumps to the end / eats clicks"):
 *  1. Every editor instance registered `AutoFocusExtension`, so each mount
 *     stole focus to that editor's end — last-mounted field won on entry
 *     open, and any late-mounting editor yanked the caret away from where
 *     the user had just clicked.
 *  2. The draggable-block handle (+ / grip) overlaid the first ~36px of the
 *     hovered line because the `pl-14` gutter utility lost to the
 *     ContentEditable's own emotion `padding` shorthand, so clicks aimed at
 *     the start of a line hit the handle instead of the text.
 *  3. The editable region showed no I-beam (`cursor: text`).
 */

async function openFirstPost(page: Page) {
  await gotoRoute(page, '/collections/posts');
  await page.getByRole('link', { name: /This is post #/ }).first().click();
  const editor = page.locator('[contenteditable="true"][data-lexical-editor="true"]').first();
  await editor.locator(':scope > p').first().waitFor();
  return editor;
}

test.describe('richtext editor pointer & focus', () => {
  test('opening an entry does not auto-focus a richtext editor', async ({ page }) => {
    await openFirstPost(page);
    // Give any late-mounting editor the chance to (wrongly) steal focus.
    await page.waitForTimeout(1000);
    const activeIsEditor = await page.evaluate(() => !!document.activeElement?.closest('[data-lexical-editor="true"]'));
    expect(activeIsEditor).toBe(false);
  });

  test('a click into the text places the caret and it stays put', async ({ page }) => {
    const editor = await openFirstPost(page);
    const para = editor.locator(':scope > p').first();
    const box = (await para.boundingBox())!;
    await page.mouse.click(box.x + 100, box.y + 10);

    const readSelection = () =>
      page.evaluate(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        return { offset: sel.anchorOffset, text: sel.anchorNode?.textContent ?? null };
      });

    const placed = await readSelection();
    expect(placed?.text).toBeTruthy();
    // The caret must not move on its own (the old AutoFocus steal fired on a
    // small delay, which users saw as "it jumps to the end after a moment").
    await page.waitForTimeout(1500);
    expect(await readSelection()).toEqual(placed);
  });

  test('drag handle sits in the gutter, clear of the text', async ({ page }) => {
    const editor = await openFirstPost(page);
    const para = editor.locator(':scope > p').first();
    await para.hover();
    const handle = page.locator('.draggable-block-menu').first();
    const handleBox = (await handle.boundingBox())!;
    const paraBox = (await para.boundingBox())!;
    expect(handleBox.x + handleBox.width).toBeLessThanOrEqual(paraBox.x);
  });

  test('editable region shows a text cursor', async ({ page }) => {
    const editor = await openFirstPost(page);
    const cursor = await editor.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('text');
  });
});
