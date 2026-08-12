import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const packageDirs = readdirSync(new URL('../packages/', import.meta.url), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const layoutHeadingIndex = readme.indexOf('## Repository layout');
if (layoutHeadingIndex === -1) {
  throw new Error(`README.md is missing a "## Repository layout" heading (checked ${repoRoot}README.md)`);
}

const afterHeading = readme.slice(layoutHeadingIndex);
const fenceStart = afterHeading.indexOf('```');
const fenceEnd = afterHeading.indexOf('```', fenceStart + 3);
if (fenceStart === -1 || fenceEnd === -1) {
  throw new Error('README.md "Repository layout" section is missing its fenced code block');
}

const layoutBlock = afterHeading.slice(fenceStart + 3, fenceEnd);

const missing = packageDirs.filter(name => !layoutBlock.includes(`${name}/`));

if (missing.length > 0) {
  throw new Error(
    `README.md "Repository layout" fenced code block is missing ${missing.length} package(s): ${
      missing.join(', ')
    }. Add every directory under packages/ to that block when a sibling package lands.`,
  );
}

console.log(`README.md "Repository layout" lists all ${packageDirs.length} packages/* directories.`);

// Root `test:ci` fans out via `pnpm -r run test:ci`, which silently no-ops on
// any workspace package that doesn't define the script (no error, no
// warning). That let decap-cms-lib-pat's lint + test:ci coverage go missing
// undetected (DCMS-1868). Pin it: every packages/* directory must define its
// own `test:ci` script, or the root aggregate is lying about its coverage.
const packagesMissingTestCi = packageDirs.filter(name => {
  const pkgJsonPath = new URL(`../packages/${name}/package.json`, import.meta.url);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  return typeof pkgJson.scripts?.['test:ci'] !== 'string';
});

if (packagesMissingTestCi.length > 0) {
  throw new Error(
    `Root "test:ci" runs "pnpm -r run test:ci", which silently skips any package missing that script. ${packagesMissingTestCi.length} package(s) have no "test:ci" script: ${
      packagesMissingTestCi.join(', ')
    }. Add one (mirroring packages/decap-cms's "pnpm run lint && pnpm run typecheck && pnpm run test") so the root gate actually covers it.`,
  );
}

console.log(`Every packages/* directory (${packageDirs.length}) defines its own "test:ci" script.`);

// DCMS-1961: README.md and docs/contributing/index.md both linked a docs/base-ui/ directory
// that never existed on disk (or was removed without updating the references). Pin every
// directory the README's "Repository layout" block names, and every relative doc-to-doc link
// in docs/contributing/index.md, to something that actually exists.
const layoutEntries = [];
let currentTopDir = null;
for (const rawLine of layoutBlock.split('\n')) {
  if (rawLine.trim() === '') continue;
  if (!/^\s/.test(rawLine)) {
    currentTopDir = rawLine.trim();
    continue;
  }
  if (!currentTopDir) continue;
  const name = rawLine.trim().split(/\s+/)[0];
  layoutEntries.push(currentTopDir + name);
}

const missingLayoutEntries = layoutEntries.filter(entry => !existsSync(join(repoRoot, entry)));

if (missingLayoutEntries.length > 0) {
  throw new Error(
    `README.md "Repository layout" fenced code block names ${missingLayoutEntries.length} path(s) that don't exist on disk: ${
      missingLayoutEntries.join(', ')
    }. Fix or remove the reference.`,
  );
}

console.log(`README.md "Repository layout" block: all ${layoutEntries.length} named paths exist on disk.`);

const contributingIndexUrl = new URL('../docs/contributing/index.md', import.meta.url);
const contributingIndexPath = fileURLToPath(contributingIndexUrl);
const contributingIndexDir = dirname(contributingIndexPath);
const contributingIndexText = readFileSync(contributingIndexUrl, 'utf8');

const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
const missingContributingLinks = [];
let linkMatch;
while ((linkMatch = linkPattern.exec(contributingIndexText)) !== null) {
  const target = linkMatch[1];
  if (/^[a-z]+:/i.test(target) || target.startsWith('#')) {
    // absolute URL (http:, mailto:, etc.) or in-page anchor - not a doc-to-doc link
    continue;
  }
  const [pathPart] = target.split('#');
  if (!pathPart) continue;
  const resolvedPath = resolve(contributingIndexDir, pathPart);
  if (!existsSync(resolvedPath)) {
    missingContributingLinks.push(`${target} (resolved to ${resolvedPath})`);
  }
}

if (missingContributingLinks.length > 0) {
  throw new Error(
    `docs/contributing/index.md links ${missingContributingLinks.length} relative path(s) that don't exist: ${
      missingContributingLinks.join(', ')
    }. Fix or remove the link.`,
  );
}

console.log('docs/contributing/index.md: all relative doc-to-doc links resolve on disk.');

// DCMS-2083: AGENTS.md cited OPERATOR-QUEUE.md as the authority for the gated-paths list, but that
// file was deleted in a "docs: cleanup docs" pass and AGENTS.md was never updated, so it pointed at
// a dead file. Pin every doc-file reference in the repo's top-level governance docs (AGENTS.md,
// README.md, CONTRIBUTING.md) to something that still exists, so the next doc cleanup that deletes a
// referenced file fails `test:ci` instead of rotting silently.
const governanceDocNames = ['AGENTS.md', 'README.md', 'CONTRIBUTING.md'];

// Every markdown (.md) file anywhere in the repo (skipping node_modules/.git/.turbo), as
// repo-root-relative paths. Used to resolve references that are only unambiguous relative to the
// surrounding prose - e.g. `restructure.md` inside a `docs/contributing/decisions/` bullet list, or
// `src/ui/README.md` inside a paragraph describing `packages/decap-cms/` - by suffix/basename match,
// since they aren't relative to the repo root.
function collectMarkdownPaths(dir, out = [], prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.turbo')) {
      continue;
    }
    const entryPath = join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collectMarkdownPaths(entryPath, out, relPath);
    } else if (entry.name.endsWith('.md')) {
      out.push(relPath);
    }
  }
  return out;
}

const repoMarkdownPaths = collectMarkdownPaths(repoRoot);

function markdownRefExistsSomewhere(ref) {
  return repoMarkdownPaths.some(p => p === ref || p.endsWith(`/${ref}`));
}

const docReferenceIssues = [];

for (const docName of governanceDocNames) {
  const docPath = join(repoRoot, docName);
  const docText = readFileSync(docPath, 'utf8');

  // Markdown links: [label](target) - skip absolute URLs and in-page anchors.
  const mdLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let mdLinkMatch;
  while ((mdLinkMatch = mdLinkPattern.exec(docText)) !== null) {
    const target = mdLinkMatch[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
    const [pathPart] = target.split('#');
    if (!pathPart) continue;
    // A leading "/" in a GitHub-flavored markdown link means repo-root-relative, not
    // filesystem-root-relative - strip it before resolving against repoRoot.
    const repoRelativePath = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart;
    if (!existsSync(resolve(repoRoot, repoRelativePath))) {
      docReferenceIssues.push(`${docName}: link target "${target}" does not resolve to a file on disk`);
    }
  }

  // Backtick-quoted references ending in .md, e.g. `OPERATOR-QUEUE.md` or `docs/contributing/index.md`.
  // Skip anything with wildcard chars (`*`, `?`) or whitespace - those are patterns, not real paths.
  const backtickMdPattern = /`([^`\s]+\.md)`/g;
  let backtickMatch;
  while ((backtickMatch = backtickMdPattern.exec(docText)) !== null) {
    const ref = backtickMatch[1];
    if (ref.includes('*') || ref.includes('?')) continue;
    if (existsSync(resolve(repoRoot, ref))) continue;
    if (!markdownRefExistsSomewhere(ref)) {
      docReferenceIssues.push(
        `${docName}: reference \`${ref}\` does not match any .md file anywhere in the repo`,
      );
    }
  }
}

if (docReferenceIssues.length > 0) {
  throw new Error(
    `${governanceDocNames.join(', ')} reference file(s) that no longer exist:\n  ${
      docReferenceIssues.join('\n  ')
    }\nFix or remove the reference.`,
  );
}

console.log(`${governanceDocNames.join(', ')}: all file references resolve on disk.`);
