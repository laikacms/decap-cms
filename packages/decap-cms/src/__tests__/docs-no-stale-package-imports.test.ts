import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// docs/ lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');

function listMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(full);
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}

// Pre-restructure (see RESTRUCTURE.md) package names followed this shape:
// `decap-cms-<name>` (e.g. `decap-cms-app`, `decap-cms-core`,
// `decap-cms-widget-string`) plus `decap-server`. None of those are real,
// importable packages anymore — the whole repo is the single
// `@laikacms/decap-cms` package with subpath exports (`@laikacms/decap-cms`,
// `@laikacms/decap-cms/app`, `@laikacms/decap-cms/core`, etc). A doc example
// that imports from the old flat name gives readers a module-not-found error.
const STALE_IMPORT_SOURCE = /\bfrom\s+['"](decap-cms-[\w-]*|decap-server)(\/[^'"]*)?['"]/g;
const STALE_REQUIRE_SOURCE = /\brequire\(\s*['"](decap-cms-[\w-]*|decap-server)(\/[^'"]*)?['"]\s*\)/g;

describe('docs/ no stale pre-restructure package-name imports (DCMS-1152)', () => {
  it('never imports from a pre-restructure `decap-cms-<name>` / `decap-server` package name', () => {
    const files = listMarkdownFiles(DOCS_DIR);
    // Sanity check: the walk above should find real files, not just fail
    // closed because nothing matched.
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(STALE_IMPORT_SOURCE)) {
        offenders.push(`${relPath}: import from '${match[1]}${match[2] ?? ''}'`);
      }
      for (const match of contents.matchAll(STALE_REQUIRE_SOURCE)) {
        offenders.push(`${relPath}: require('${match[1]}${match[2] ?? ''}')`);
      }
    }

    // If this fails, a doc example still imports from a pre-restructure
    // package name. Rewrite it to `@laikacms/decap-cms` (or the matching
    // `@laikacms/decap-cms/<subpath>` export) instead.
    expect(offenders).toEqual([]);
  });
});
