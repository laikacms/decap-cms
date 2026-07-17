import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { markdownFormat } from '@/format-packs/markdown';
import { plainTextFormat } from '@/format-packs/plaintext';
import { portableTextToLexical } from '@/lib/richtext/bridge/portableTextToLexical';
import { registerFormat, unregisterFormat } from '@/lib/richtext/index';
import { createLexicalRichtextValue } from '@/lib/richtext/value/LexicalRichtextValue';

/**
 * DCMS-471: an untouched RichtextValue must serialise back to its original
 * string byte-for-byte, even when the output mapper normalises on export.
 *
 * The markdown mapper turns soft line breaks into two-space hard breaks, so
 * without the pristine shortcut a document like the one below round-trips to
 * a *different* string. Decap's entryDraft dirty-check compares
 * `JSON.stringify` of draft vs entry, so the mount-time editor echo marked a
 * freshly opened, unedited entry as "unsaved changes" — and navigating away
 * hit the native are-you-sure confirm. (Found via superstar.nl's About page.)
 */
const SOFT_BREAK_MARKDOWN = `# About us

Some flowing paragraph text.

---

**Opening hours:**
Monday to Friday 7:30 am - 4:00 pm

**Some Company B.V.**
Example Street 12 • 1234 AB Sometown
Tel: +31 (0)162-457400
VAT: NL008701763B01`;

beforeAll(() => {
  registerFormat(markdownFormat);
  registerFormat(plainTextFormat);
});
afterAll(() => {
  unregisterFormat(markdownFormat.id);
  unregisterFormat(plainTextFormat.id);
});

describe('RichtextValue pristine serialisation (DCMS-471)', () => {
  it('the fixture actually normalises under the markdown mapper (guard)', () => {
    const value = createLexicalRichtextValue(SOFT_BREAK_MARKDOWN, { hint: 'markdown' });
    // Force a real change so toString() goes through the mapper.
    value.setPortableText([...value.portableText]);
    value.setPortableText(value.portableText.slice(0, -1));
    expect(value.toString()).not.toBe(SOFT_BREAK_MARKDOWN);
  });

  it('an untouched value serialises to the original string byte-for-byte', () => {
    const value = createLexicalRichtextValue(SOFT_BREAK_MARKDOWN, { hint: 'markdown' });
    expect(value.toString()).toBe(SOFT_BREAK_MARKDOWN);
    expect(value.toJSON()).toBe(SOFT_BREAK_MARKDOWN);
  });

  it('a mount echo (structurally identical PT) keeps the value pristine', () => {
    const value = createLexicalRichtextValue(SOFT_BREAK_MARKDOWN, { hint: 'markdown' });
    // The widget mounts the editor from `value.editorState` and Lexical's
    // OnChangePlugin echoes that state straight back through setEditorState.
    value.setEditorState(portableTextToLexical(value.portableText));
    expect(value.toString()).toBe(SOFT_BREAK_MARKDOWN);
  });

  it('a repeated mount echo keeps the value pristine', () => {
    const value = createLexicalRichtextValue(SOFT_BREAK_MARKDOWN, { hint: 'markdown' });
    value.setEditorState(portableTextToLexical(value.portableText));
    value.setEditorState(portableTextToLexical(value.portableText));
    expect(value.toString()).toBe(SOFT_BREAK_MARKDOWN);
  });

  it('a real change switches to mapper output and stays there', () => {
    const value = createLexicalRichtextValue(SOFT_BREAK_MARKDOWN, { hint: 'markdown' });
    value.setPortableText(value.portableText.slice(0, 1));
    const output = value.toString();
    expect(output).not.toBe(SOFT_BREAK_MARKDOWN);
    expect(output).toContain('# About us');
  });

  it('changing the output format drops the raw shortcut', () => {
    const value = createLexicalRichtextValue('**bold** text', { hint: 'markdown' });
    value.setOutputFormat('plainText');
    expect(value.toString()).not.toBe('**bold** text');
  });
});
