import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Pins the class of bug in DCMS-1209: `AGENTS.md`'s "Other docs" section
// referenced `WORKLIST.md`, a root-level file that was deleted by `c701a0f98`
// ("refactor(repo): delete superseded root-layout tree, finish workspace
// move") and never restored. Nothing caught the dangling reference because
// `root-docs-no-stale-package-subpaths.test.ts` only scans for stale
// `@laikacms/decap-cms` subpath imports, and its `ROOT_DOC_FILES` list didn't
// include `AGENTS.md` at all.
//
// This test scans root `*.md` files for backtick-quoted references to other
// root-level file paths (e.g. `` `WORKLIST.md` ``) and fails if the
// referenced path doesn't exist in the tree.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');

const ROOT_DOC_FILES = [
  'README.md',
  'RESTRUCTURE.md',
  'CONTRIBUTING.md',
  'BREAKING_CHANGES_V2_BETA.md',
  'AGENTS.md',
];

// Matches a backtick-quoted root-level markdown doc reference, e.g.
// `` `WORKLIST.md` ``. Scoped to `.md` (rather than also `.json`/`.ts`/etc.)
// because non-doc root docs like RESTRUCTURE.md and CONTRIBUTING.md legitimately
// mention historical/example/nested filenames (deleted configs, demo bundles,
// per-package files) by basename in prose — those aren't "this repo's root doc
// set" references and would be false positives here. `.md` doc-to-doc
// cross-references are the class of bug this test pins (DCMS-1209).
const ROOT_FILE_REFERENCE = /`([A-Za-z0-9_.-]+\.md)`/g;

// Filenames that are legitimately referenced without existing as literal
// root-level files today (deleted-in-the-past files named in historical
// narrative, e.g. RESTRUCTURE.md's "what changed" table).
const IGNORED_REFERENCES = new Set(['CHANGELOG.md']);

function listScannedFiles(): string[] {
  return ROOT_DOC_FILES.map(name => path.join(REPO_ROOT, name)).filter(file => fs.existsSync(file));
}

describe('root docs: no stale root-level file references (DCMS-1209)', () => {
  it('every backtick-quoted root-level file path referenced in a root doc exists', () => {
    const files = listScannedFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(ROOT_FILE_REFERENCE)) {
        const referenced = match[1];
        if (IGNORED_REFERENCES.has(referenced)) continue;

        const referencedPath = path.join(REPO_ROOT, referenced);
        if (!fs.existsSync(referencedPath)) {
          offenders.push(`${relPath}: references nonexistent root file \`${referenced}\``);
        }
      }
    }

    // If this fails, a root doc references a root-level file that doesn't
    // exist in the tree. Either restore the file or remove/update the
    // reference (see DCMS-1209, where `AGENTS.md` referenced a deleted
    // `WORKLIST.md`).
    expect(offenders).toEqual([]);
  });
});
