import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `docs-no-stale-package-imports.test.ts` only scans `docs/`, so it never
// sees the root-level `*.md` files (README.md, RESTRUCTURE.md, etc.) or the
// `dev-test/*.html` demo pages, even though those are just as reader-facing.
// This test covers that gap for stale `@laikacms/decap-cms` subpath imports
// that prior versions of RESTRUCTURE.md / `laika-bare.html` got wrong:
//
//   1. Importing `App` from `@laikacms/decap-cms/core` — `App` is exported
//      from `@laikacms/decap-cms/app` (see `packages/decap-cms/src/app/index.ts`);
//      `core`'s own doc comment says the routed App layer lives in `app`, not
//      `core`.
//   2. Importing from `@laikacms/decap-cms/widget-string` (DCMS-1151) — there
//      is no such subpath export. Widgets are only exposed via the wildcard
//      `./widgets/*` (see `packages/decap-cms/package.json#exports`), so the
//      real subpath is `@laikacms/decap-cms/widgets/string`, exporting
//      `DecapCmsWidgetString` (see `packages/decap-cms/src/widgets/string/index.ts`),
//      not `widget` / `stringWidget`.
//   3. Any other dashed `@laikacms/decap-cms/backend-<name>` or
//      `@laikacms/decap-cms/widget-<name>` subpath (DCMS-1222) — the package
//      only ever exports the plural, slashed wildcards `./backends/*` and
//      `./widgets/*` (see `packages/decap-cms/package.json#exports`), never a
//      singular dashed form. `laika-bare.html` previously used
//      `/backend-github` and `/widget-richtext`, neither of which resolves.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');

const ROOT_DOC_FILES = [
  'README.md',
  'RESTRUCTURE.md',
  'CONTRIBUTING.md',
  'BREAKING_CHANGES_V4_BETA.md',
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

// Matches an import (or bare specifier reference) from any singular, dashed
// `@laikacms/decap-cms/backend-<name>` or `@laikacms/decap-cms/widget-<name>`
// subpath. The package only ever exports the plural, slashed wildcards
// `./backends/*` and `./widgets/*` — a dashed singular subpath never exists.
const STALE_DASHED_BACKEND_OR_WIDGET_SUBPATH =
  /['"]@laikacms\/decap-cms\/(backend|widget)-([\w-]+)['"]/g;

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

  it('never references a dashed @laikacms/decap-cms/backend-<name> or /widget-<name> subpath (DCMS-1222)', () => {
    const files = listScannedFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(STALE_DASHED_BACKEND_OR_WIDGET_SUBPATH)) {
        offenders.push(`${relPath}: references '@laikacms/decap-cms/${match[1]}-${match[2]}'`);
      }
    }

    // If this fails, a doc/demo example references a dashed
    // `/backend-<name>` or `/widget-<name>` subpath. Those subpaths never
    // exist — the package only exports the plural, slashed wildcards
    // `./backends/*` and `./widgets/*` (see
    // `packages/decap-cms/package.json#exports`). Use e.g.
    // `/backends/github` or `/widgets/richtext` instead.
    expect(offenders).toEqual([]);
  });
});
