import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// src/backends lives one level up from this test file
// (src/__tests__ -> src -> backends).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKENDS_DIR = path.resolve(HERE, '../backends');

const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name) ? [full] : [];
  });
}

// Backends run entirely in the browser (they talk to remote APIs via
// `fetch`), so they must never reach for Node's built-in `path` module —
// bundlers targeting the browser either hard-fail (esbuild) or silently
// externalize it (vite), producing a runtime crash the first time the
// externalized function is actually called. See DCMS-1223.
const NODE_PATH_IMPORT = /\bfrom\s+['"]node:path['"]|\bfrom\s+['"]path['"]/g;
const NODE_PATH_REQUIRE = /\brequire\(\s*['"](node:)?path['"]\s*\)/g;

describe('src/backends/ never imports the Node builtin path module (DCMS-1223)', () => {
  it('has no import/require of "path" or "node:path"', () => {
    const files = listSourceFiles(BACKENDS_DIR);
    // Sanity check: the walk above should find real files, not just fail
    // closed because nothing matched.
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(BACKENDS_DIR, file);

      for (const match of contents.matchAll(NODE_PATH_IMPORT)) {
        offenders.push(`${relPath}: ${match[0]}`);
      }
      for (const match of contents.matchAll(NODE_PATH_REQUIRE)) {
        offenders.push(`${relPath}: ${match[0]}`);
      }
    }

    // If this fails, a backend file re-introduced a Node `path` import.
    // Use the URL-path helpers in `@/lib/util/index` (basename, dirname,
    // join, etc.) instead — they use `/`-separator semantics that are
    // correct for remote-API paths and safe to bundle for the browser.
    expect(offenders).toEqual([]);
  });
});
