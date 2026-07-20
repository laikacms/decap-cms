import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Pins the class of bug in DCMS-1215: `packages/decap-cms/README.md` linked to
// `[CONTRIBUTING.md](CONTRIBUTING.md)`, a relative path that only resolves if
// CONTRIBUTING.md lived next to the README. It actually lives at the repo
// root (four levels up from this test file), so the link 404'd for anyone
// following it from GitHub.
//
// This test scans every `*.md` file under `packages/decap-cms` for
// Markdown-link-syntax relative paths (`[text](path)`) and fails if the
// target doesn't exist on disk, resolved relative to the linking file.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const DOCS_ROOT = path.join(REPO_ROOT, 'packages/decap-cms');

// Matches Markdown link targets: `[label](target)`. Captures only the path
// portion, dropping an optional `"title"` suffix.
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function isExternalOrNonFileLink(target: string): boolean {
  if (target.startsWith('#')) return true; // in-page anchor
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return true; // scheme, e.g. https:, mailto:
  if (target.startsWith('//')) return true; // protocol-relative
  return false;
}

function listMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('packages/decap-cms docs: no broken relative Markdown links (DCMS-1215)', () => {
  it('every relative link target in a packages/decap-cms *.md file exists on disk', () => {
    const files = listMarkdownFiles(DOCS_ROOT);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const relFile = path.relative(REPO_ROOT, file);

      for (const match of contents.matchAll(MARKDOWN_LINK)) {
        const target = match[1];
        if (isExternalOrNonFileLink(target)) continue;

        // Strip a trailing in-file anchor, e.g. `../CONTRIBUTING.md#setup`.
        const [targetPath] = target.split('#');
        if (!targetPath) continue; // pure in-page anchor with no path prefix

        // A leading `/` is repo-root-relative on GitHub (e.g. `/.github/x.svg`),
        // not a filesystem-absolute path — resolve it against REPO_ROOT.
        const resolved = targetPath.startsWith('/')
          ? path.join(REPO_ROOT, targetPath)
          : path.resolve(path.dirname(file), targetPath);
        if (!fs.existsSync(resolved)) {
          offenders.push(`${relFile}: links to nonexistent path \`${target}\``);
        }
      }
    }

    // If this fails, a doc under packages/decap-cms links to a relative path
    // that doesn't resolve. Fix the link (see DCMS-1215, where README.md
    // linked to CONTRIBUTING.md as a sibling instead of `../../CONTRIBUTING.md`).
    expect(offenders).toEqual([]);
  });
});
