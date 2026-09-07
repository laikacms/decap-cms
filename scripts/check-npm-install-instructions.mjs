import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// DCMS-2213: several package READMEs told users to `npm install @laikacms/<pkg>` for packages that
// have never been published to npm (only `@laikacms/decap-cms` is on the registry - everything else
// under packages/* and extensions/* is source-only, meant to be vendored into a consumer's project).
// Pin the set of packages that are actually publishable, and fail if any README's install
// instructions name a package outside that set, so the next "add an install snippet" edit can't
// silently reintroduce a 404.
//
// The allowlist is intentionally static rather than a live `npm view` lookup: this repo's checks
// don't hit the network (see check-readme-layout.mjs, check-contributing-typecheck-count.mjs), and a
// package only ever leaves "not published" by a deliberate `pnpm release` - a one-line allowlist
// edit at that time is the right amount of friction.
const publishedPackages = new Set(['@laikacms/decap-cms']);

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// `npm install <pkg>`, `npm i <pkg>`, `pnpm add <pkg>`, `yarn add <pkg>` - the install commands this
// repo's own docs use.
const installCommandPattern = /\b(?:npm\s+(?:install|i)|pnpm\s+add|yarn\s+add)\s+(@laikacms\/[\w.-]+)/g;

function collectMarkdownFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.turbo')) {
      continue;
    }
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(entryPath, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(entryPath);
    }
  }
  return out;
}

const markdownFiles = collectMarkdownFiles(repoRoot);

const violations = [];

for (const filePath of markdownFiles) {
  const text = readFileSync(filePath, 'utf8');
  let match;
  installCommandPattern.lastIndex = 0;
  while ((match = installCommandPattern.exec(text)) !== null) {
    const pkgName = match[1];
    if (!publishedPackages.has(pkgName)) {
      const relPath = filePath.slice(repoRoot.length);
      violations.push(`${relPath}: instructs installing "${pkgName}" via npm/pnpm/yarn`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `Found README install instructions for package(s) not in the published allowlist `
      + `(${[...publishedPackages].join(', ')}):\n  ${violations.join('\n  ')}\n`
      + 'If the package is now actually published to npm, add it to `publishedPackages` in '
      + 'scripts/check-npm-install-instructions.mjs. Otherwise, replace the install instructions with '
      + 'vendoring guidance (see extensions/widgets/map/README.md for the pattern) - see #2213.',
  );
}

console.log(
  `Checked ${markdownFiles.length} README/markdown file(s): every "npm install @laikacms/<pkg>" `
    + `instruction names a published package (${[...publishedPackages].join(', ')}).`,
);
