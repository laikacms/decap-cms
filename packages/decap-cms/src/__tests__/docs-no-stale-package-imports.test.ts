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

// Pre-restructure (see restructure.md) package names followed this shape:
// `decap-cms-<name>` (e.g. `decap-cms-app`, `decap-cms-core`,
// `decap-cms-widget-string`) plus `decap-server`. None of those are real,
// importable packages anymore — the whole repo is the single
// `decap-cms` package with subpath exports (`decap-cms`,
// `decap-cms/app`, `decap-cms/core`, etc). A doc example
// that imports from the old flat name gives readers a module-not-found error.
const STALE_IMPORT_SOURCE = /\bfrom\s+['"](decap-cms-[\w-]*|decap-server)(\/[^'"]*)?['"]/g;
const STALE_REQUIRE_SOURCE = /\brequire\(\s*['"](decap-cms-[\w-]*|decap-server)(\/[^'"]*)?['"]\s*\)/g;

// restructure.md is the canonical record of the restructure itself: its "what
// changed" table deliberately quotes the old `from 'decap-cms-core'` /
// `from 'decap-cms-lib-util/...'` import shapes to describe what was rewritten.
// Those are historical narrative, not live examples, so exclude it from the
// scan (every other doc should only ever show importable `decap-cms`
// specifiers).
const EXCLUDED_RELATIVE_PATHS = new Set(['docs/contributing/decisions/restructure.md']);

// Extension packages under `extensions/` are published on their own and share
// the `decap-cms-<name>` shape by design (that is the convention a third-party
// widget author follows). They are real and importable, so the stale-name
// pattern must not flag them.
const LIVE_SIBLING_PACKAGES = new Set(['decap-cms-widget-map']);

describe('docs/ no stale pre-restructure package-name imports (DCMS-1152)', () => {
  it('never imports from a pre-restructure `decap-cms-<name>` / `decap-server` package name', () => {
    const files = listMarkdownFiles(DOCS_DIR);
    // Sanity check: the walk above should find real files, not just fail
    // closed because nothing matched.
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of files) {
      const relPath = path.relative(REPO_ROOT, file);
      if (EXCLUDED_RELATIVE_PATHS.has(relPath.split(path.sep).join('/'))) continue;
      const contents = fs.readFileSync(file, 'utf8');

      for (const match of contents.matchAll(STALE_IMPORT_SOURCE)) {
        if (LIVE_SIBLING_PACKAGES.has(match[1])) continue;
        offenders.push(`${relPath}: import from '${match[1]}${match[2] ?? ''}'`);
      }
      for (const match of contents.matchAll(STALE_REQUIRE_SOURCE)) {
        if (LIVE_SIBLING_PACKAGES.has(match[1])) continue;
        offenders.push(`${relPath}: require('${match[1]}${match[2] ?? ''}')`);
      }
    }

    // If this fails, a doc example still imports from a pre-restructure
    // package name. Rewrite it to `decap-cms` (or the matching
    // `decap-cms/<subpath>` export) instead.
    expect(offenders).toEqual([]);
  });
});
