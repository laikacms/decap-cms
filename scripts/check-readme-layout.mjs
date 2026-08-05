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
