import { afterEach, describe, expect, it } from 'vitest';

import { markdownFormat } from '@/format-packs/markdown';
import { getFormat, registerFormat, unregisterFormat } from '@/lib/richtext';

/**
 * Pins the DCMS-NEW-FORMATPACKS finding (issue #1093): only `markdown` is
 * auto-registered by app bootstrap (`src/app/extensions.ts`,
 * `src/laika-app/extensions.ts`). `html` and `plainText` ship as format
 * packs but are never registered automatically — a `format: html` or
 * `format: plainText` field config is inert until the host site calls
 * `CMS.registerRichtextFormat` itself. There is also no `portabletext`
 * format pack; Portable Text is the widget's internal representation, not a
 * selectable output format.
 */
describe('richtext widget: registered formats', () => {
  afterEach(() => {
    unregisterFormat('markdown');
  });

  it('has no formats registered until something registers them', () => {
    expect(getFormat('html')).toBeUndefined();
    expect(getFormat('plainText')).toBeUndefined();
    expect(getFormat('portabletext')).toBeUndefined();
  });

  it('registering markdown does not implicitly register html or plainText', () => {
    registerFormat(markdownFormat);

    expect(getFormat('markdown')).toBeDefined();
    expect(getFormat('html')).toBeUndefined();
    expect(getFormat('plainText')).toBeUndefined();
  });
});
