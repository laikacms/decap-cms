import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import packageJson from '../../../../package.json';

/**
 * DCMS-2099 / #2110 pinning test.
 *
 * `format-packs-plan.md` describes MDX as the proof-of-concept custom
 * format pack, but only the parse direction has ever been built
 * (`attributes.ts`, `parse/fromMdx.ts`, `parse/mdastToPortableText.ts`).
 * There is no `index.ts` assembling a `FormatPack`, no `fromPortableText`
 * serializer, and `package.json#exports` intentionally nulls the subpath so
 * nothing can accidentally import it as if it worked.
 *
 * This test pins that "shelved" state. If it starts failing because
 * `./format-packs/mdx` now resolves, someone finished Phase 7 — update this
 * test (and format-packs-plan.md's status note) to reflect the real,
 * working export instead of deleting the coverage.
 */
describe('format-packs/mdx: no FormatPack export (shelved, DCMS-2099)', () => {
  it('package.json#exports nulls the "./format-packs/mdx" subpath', () => {
    const exportsMap = packageJson.exports as Record<string, unknown>;
    expect(exportsMap['./format-packs/mdx']).toBeNull();
  });

  it('has no index.ts (no FormatPack assembly point)', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const mdxDir = path.resolve(dir, '..');
    expect(existsSync(path.join(mdxDir, 'index.ts'))).toBe(false);
  });

  it('has no serialize/ directory (fromPortableText direction unbuilt)', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const mdxDir = path.resolve(dir, '..');
    expect(existsSync(path.join(mdxDir, 'serialize'))).toBe(false);
  });
});
