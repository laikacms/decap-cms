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
