import { readFileSync, readdirSync } from 'node:fs';
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
