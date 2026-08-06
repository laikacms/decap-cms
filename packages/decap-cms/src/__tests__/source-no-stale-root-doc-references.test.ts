import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Pins the class of bug in DCMS-1541 (issue #1543): `registry.tsx` had two
// string literals (a runtime `console.warn` and a JSDoc comment) pointing
// end users at `BREAKING_CHANGES_V2_BETA.md`, a root doc that was deleted in
// commit 2bcfdbad6 and replaced by `breaking-changes-v4-beta.md`.
//
// DCMS-1532 (#1534) fixed every other reference to the old filename, but
// that pass only scanned `*.md` files via
// `docs-no-broken-relative-links.test.ts` (Markdown-link-syntax targets) plus
// a manual pass over AGENTS.md. These two `.tsx` string literals used the
// bare filename (no Markdown link syntax, no relative path) inside source
// code, so neither the link scanner nor a human diff pass over docs ever
// looked at them.
//
// This test scans every `.ts`/`.tsx` file under `packages/` for bare
// references to an ALL-CAPS root-doc-style filename (the convention used by
// README.md, CONTRIBUTING.md, SECURITY.md, breaking-changes-v4-beta.md,
// etc.) and fails if no doc with that filename exists at the repo root or
// anywhere under `docs/` (some of these docs, e.g. breaking-changes-v4-beta.md
// and format-packs-plan.md, live under `docs/contributing/`). That catches
// this exact case (a deleted doc's old name surviving in a source string) and
// the general class (any stale root-doc filename typo'd or left behind in
// source after a rename/delete), without needing a hardcoded list of "known
// deleted docs".
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const SCAN_ROOT = path.join(REPO_ROOT, 'packages');

// Matches bare filenames like `BREAKING_CHANGES_V2_BETA.md`, `SECURITY.md`,
// `CONTRIBUTING.md`: root-doc naming convention is ALL_CAPS_WITH_UNDERSCORES.
const ROOT_DOC_REFERENCE = /\b([A-Z][A-Z0-9_]*\.md)\b/g;

// The set of doc basenames a source reference may legitimately point at: the
// repo-root `*.md` files plus every `*.md` under `docs/` (recursively).
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

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('packages source: no stale root-doc filename references (DCMS-1541)', () => {
  it('every ALL-CAPS *.md filename referenced in .ts/.tsx source exists at the repo root or under docs/', () => {
    const files = listSourceFiles(SCAN_ROOT);
    expect(files.length).toBeGreaterThan(0);

    const knownDocNames = collectKnownDocNames();
    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relFile = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(ROOT_DOC_REFERENCE)) {
        const docName = match[1];
        if (!knownDocNames.has(docName)) {
          offenders.push(`${relFile}: references nonexistent doc \`${docName}\``);
        }
      }
    }

    // If this fails, a .ts/.tsx source file (a console.warn message, a
    // JSDoc comment, etc.) still names a root-level doc that no longer
    // exists — most likely it was renamed or deleted and this reference was
    // missed because it's a bare filename in source, not a Markdown link.
    // Fix by updating the reference to the doc's current name (see DCMS-1541,
    // where `BREAKING_CHANGES_V2_BETA.md` should have become
    // `breaking-changes-v4-beta.md`).
    expect(offenders).toEqual([]);
  });
});
