import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `docs-no-stale-package-imports.test.ts` only scans `docs/`, so it never
// sees the root-level `*.md` files (README.md, RESTRUCTURE.md, etc.) or the
// `dev-test/*.html` demo pages, even though those are just as reader-facing.
// This test covers that gap for two specific stale `@laikacms/decap-cms`
// subpath imports that a prior version of RESTRUCTURE.md (and the
// `laika-bare.html` dev-test page it partly mirrors) got wrong (DCMS-1151):
//
//   1. Importing `App` from `@laikacms/decap-cms/core` — `App` is exported
//      from `@laikacms/decap-cms/app` (see `packages/decap-cms/src/app/index.ts`);
//      `core`'s own doc comment says the routed App layer lives in `app`, not
//      `core`.
//   2. Importing from `@laikacms/decap-cms/widget-string` — there is no such
//      subpath export. Widgets are only exposed via the wildcard
//      `./widgets/*` (see `packages/decap-cms/package.json#exports`), so the
//      real subpath is `@laikacms/decap-cms/widgets/string`, exporting
//      `DecapCmsWidgetString` (see `packages/decap-cms/src/widgets/string/index.ts`),
//      not `widget` / `stringWidget`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');

const ROOT_DOC_FILES = [
  'README.md',
  'RESTRUCTURE.md',
  'CONTRIBUTING.md',
  'BREAKING_CHANGES_V2_BETA.md',
];

function listDevTestHtmlFiles(): string[] {
  const devTestDir = path.join(REPO_ROOT, 'packages/decap-cms/dev-test');
  return fs
    .readdirSync(devTestDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(devTestDir, entry.name));
}

function listScannedFiles(): string[] {
  const rootDocs = ROOT_DOC_FILES.map(name => path.join(REPO_ROOT, name)).filter(file => fs.existsSync(file));
  return [...rootDocs, ...listDevTestHtmlFiles()];
}

// Matches any `import { ... } from '@laikacms/decap-cms/core'` (or `"..."`)
// statement whose named-import clause includes the bare identifier `App`
// (not `AppContent`, `AppLayoutRenderProps`, etc.).
const STALE_CORE_APP_IMPORT = /import\s*\{([^}]*)\}\s*from\s+['"]@laikacms\/decap-cms\/core['"]/g;

// Matches an import from the nonexistent `/widget-string` subpath (correct
// subpath is the plural `/widgets/string`).
const STALE_WIDGET_STRING_SUBPATH = /from\s+['"]@laikacms\/decap-cms\/widget-string['"]/g;

describe('root docs / dev-test pages: no stale @laikacms/decap-cms subpath imports (DCMS-1151)', () => {
  it('never imports `App` from `@laikacms/decap-cms/core`', () => {
    const files = listScannedFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(STALE_CORE_APP_IMPORT)) {
        const namedImports = match[1].split(',').map(name => name.trim());
        if (namedImports.some(name => name === 'App' || name.startsWith('App '))) {
          offenders.push(`${relPath}: imports App from '@laikacms/decap-cms/core'`);
        }
      }
    }

    // If this fails, a doc/demo example imports `App` from `/core`. `App` is
    // exported from `@laikacms/decap-cms/app`, not `/core` — fix the import
    // to use the `/app` subpath.
    expect(offenders).toEqual([]);
  });

  it("never imports from the nonexistent '@laikacms/decap-cms/widget-string' subpath", () => {
    const files = listScannedFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const _match of contents.matchAll(STALE_WIDGET_STRING_SUBPATH)) {
        offenders.push(`${relPath}: imports from '@laikacms/decap-cms/widget-string'`);
      }
    }

    // If this fails, a doc/demo example imports from the nonexistent
    // `/widget-string` subpath. The real subpath is the plural
    // `/widgets/string`, exporting `DecapCmsWidgetString` (not `widget` /
    // `stringWidget`).
    expect(offenders).toEqual([]);
  });
});
