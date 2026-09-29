import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { registerExtensions } from '@/app/extensions';
import { getWidget } from '@/core/lib/registry';

/**
 * docs/community-widgets.md named `relation`, `uuid`, `colorstring` and `code`
 * as "opt-in" bundled widgets, but `registerExtensions()` (run by the full
 * app entry) registers them unconditionally; only `app/bare` skips them
 * (DCMS-2388). This pins the code fact and keeps the doc from calling them
 * opt-in again.
 */

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../..');
const docPath = path.resolve(repoRoot, 'docs/community-widgets.md');

const bundledWidgets = ['relation', 'uuid', 'colorstring', 'code'];
// The `colorstring` widget directory registers under the field type `color`.
const registeredNames: Record<string, string> = { relation: 'relation', uuid: 'uuid', colorstring: 'color', code: 'code' };

describe('docs/community-widgets.md bundled widgets (DCMS-2388)', () => {
  it.each(bundledWidgets)('registerExtensions() registers the %s widget by default', name => {
    registerExtensions();
    expect(getWidget(registeredNames[name])).toBeDefined();
  });

  it('does not describe the default-registered widgets as opt-in', () => {
    const doc = readFileSync(docPath, 'utf8');
    for (const name of bundledWidgets) {
      expect(doc).toContain(`\`${name}\``);
    }
    expect(doc).not.toMatch(/opt-in/i);
    expect(doc).toMatch(/registers them by default/);
    expect(doc).toContain('app/bare');
  });
});
