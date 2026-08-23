import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Pins the class of bug in DCMS-1209: `AGENTS.md`'s "Other docs" section
// referenced `WORKLIST.md`, a root-level file that was deleted by `c701a0f98`
// ("refactor(repo): delete superseded root-layout tree, finish workspace
// move") and never restored. Nothing caught the dangling reference because
// `root-docs-no-stale-package-subpaths.test.ts` only scans for stale
// `decap-cms` subpath imports, and its `ROOT_DOC_FILES` list didn't
// include `AGENTS.md` at all.
//
// This test scans root `*.md` files for backtick-quoted references to other
// root-level file paths (e.g. `` `WORKLIST.md` ``) and fails if the
// referenced path doesn't exist in the tree.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');

const ROOT_DOC_FILES = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  // Relocated under docs/contributing/ but still scanned for stale doc-to-doc refs.
  'docs/contributing/decisions/restructure.md',
  'docs/contributing/decisions/breaking-changes-v4-beta.md',
];

// Doc basenames a backtick reference may legitimately point at: the repo-root
// `*.md` files plus every `*.md` under `docs/` (recursively). Docs like
// restructure.md and breaking-changes-v4-beta.md moved under docs/contributing/,
// so a bare `` `restructure.md` `` reference resolves there, not at the root.
function collectKnownDocNames(): Set<string> {
  const names = new Set<string>();
  for (const entry of fs.readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) names.add(entry.name);
  }
  const walkDocs = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDocs(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) names.add(entry.name);
    }
  };
  walkDocs(path.join(REPO_ROOT, 'docs'));
  return names;
}

// Matches a backtick-quoted root-level markdown doc reference, e.g.
// `` `WORKLIST.md` ``. Scoped to `.md` (rather than also `.json`/`.ts`/etc.)
// because non-doc root docs like restructure.md and CONTRIBUTING.md legitimately
// mention historical/example/nested filenames (deleted configs, demo bundles,
// per-package files) by basename in prose — those aren't "this repo's root doc
// set" references and would be false positives here. `.md` doc-to-doc
// cross-references are the class of bug this test pins (DCMS-1209).
const ROOT_FILE_REFERENCE = /`([A-Za-z0-9_.-]+\.md)`/g;

// Filenames that are legitimately referenced without existing as literal
// root-level files today (deleted-in-the-past files named in historical
// narrative, e.g. restructure.md's "what changed" table).
const IGNORED_REFERENCES = new Set(['CHANGELOG.md']);

function listScannedFiles(): string[] {
  return ROOT_DOC_FILES.map(name => path.join(REPO_ROOT, name)).filter(file => fs.existsSync(file));
}

describe('root docs: no stale root-level file references (DCMS-1209)', () => {
  it('every backtick-quoted root-level file path referenced in a root doc exists', () => {
    const files = listScannedFiles();
    expect(files.length).toBeGreaterThan(0);

    const knownDocNames = collectKnownDocNames();
    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(ROOT_FILE_REFERENCE)) {
        const referenced = match[1];
        if (IGNORED_REFERENCES.has(referenced)) continue;

        const existsAtRoot = fs.existsSync(path.join(REPO_ROOT, referenced));
        if (!existsAtRoot && !knownDocNames.has(referenced)) {
          offenders.push(`${relPath}: references nonexistent file \`${referenced}\``);
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
