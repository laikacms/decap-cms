import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Pins the enforcement gap described in
 * https://github.com/decaporg/decap-cms/issues/1759 (DCMS-1759, follow-up to
 * DCMS-1671/#1675 which fixed the equivalent claim on `main`):
 *
 * CONTRIBUTING.md documents an area-slug scope and a `(DCMS-nnn)` ticket
 * suffix as commit-message conventions, but commitlint.config.cjs only
 * extends `@commitlint/config-conventional`, which has no `scope-enum` rule
 * and no rule requiring a ticket suffix. Both are checked by reviewers, not
 * by the `commit-msg` hook.
 *
 * If someone later adds real scope/ticket enforcement to
 * commitlint.config.cjs without updating CONTRIBUTING.md (or vice versa),
 * this test should start failing so the drift gets noticed.
 */

// CONTRIBUTING.md and commitlint.config.cjs live at the repo root, four
// levels up from this test file (src/__tests__ -> src -> packages/decap-cms
// -> packages -> repo root). Anchor on import.meta.url instead of
// __dirname: the __dirname shim vitest injects for ESM sources resolves to
// a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const CONTRIBUTING_PATH = path.join(REPO_ROOT, 'CONTRIBUTING.md');
const COMMITLINT_CONFIG_PATH = path.join(REPO_ROOT, 'commitlint.config.cjs');

describe('commitlint house-style enforcement (DCMS-1759)', () => {
  it('commitlint.config.cjs only extends config-conventional (no custom rules object)', async () => {
    // commitlint.config.cjs is CommonJS; `import()` on a .cjs path resolves
    // its `module.exports` as the default export, which works from this
    // ESM test file without needing a `require` shim.
    const { default: config } = await import(pathToFileURL(COMMITLINT_CONFIG_PATH).href) as {
      default: { extends?: string[], rules?: unknown, plugins?: unknown },
    };
    expect(config.extends).toEqual(['@commitlint/config-conventional']);
    expect(config.rules).toBeUndefined();
    expect(config.plugins).toBeUndefined();
  });

  it(
    'CONTRIBUTING.md states the scope/ticket-suffix convention is review-checked, not commitlint-enforced',
    () => {
      const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
      const pullRequestsSection = contributing.split(/^## /m).find(section =>
        section.startsWith('Pull requests')
      );
      expect(pullRequestsSection).toBeDefined();

      // If this fails, CONTRIBUTING.md's "Pull requests" section stopped
      // spelling out that the scope/ticket-suffix house style is a
      // review-enforced convention rather than a commitlint rule — update
      // whichever one (docs or config) drifted back out of sync.
      expect(pullRequestsSection).toMatch(/neither\s+is\s+mechanically enforced by commitlint/i);
      expect(pullRequestsSection).toMatch(/scope-enum/);
      expect(pullRequestsSection).toMatch(/DCMS-nnn/);
    },
  );
});
