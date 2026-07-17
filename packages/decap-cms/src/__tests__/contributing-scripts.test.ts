import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// CONTRIBUTING.md lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const CONTRIBUTING_PATH = path.join(REPO_ROOT, 'CONTRIBUTING.md');
const ROOT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');

// CLI subcommands that follow `pnpm` but aren't scripts declared in
// package.json (e.g. `pnpm install`, `pnpm 9` in a version reference).
const NOT_A_SCRIPT = new Set(['install', 'workspace']);

describe('CONTRIBUTING.md#scripts', () => {
  it('only documents `pnpm <script>` commands that exist in the root package.json', () => {
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const rootPackageJson = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const declaredScripts = new Set(Object.keys(rootPackageJson.scripts ?? {}));

    const mentioned = new Set<string>();
    for (const match of contributing.matchAll(/pnpm ([a-z][a-z0-9:-]*)/g)) {
      mentioned.add(match[1]);
    }

    // Sanity check: the regex above should find real script mentions, not
    // just fail closed because nothing matched.
    expect(mentioned.size).toBeGreaterThan(0);

    const undeclared = [...mentioned]
      .filter(name => !NOT_A_SCRIPT.has(name))
      .filter(name => !declaredScripts.has(name));

    // If this fails, CONTRIBUTING.md references a `pnpm <script>` that no
    // longer exists in package.json#scripts (or was renamed) — update
    // whichever one is stale so the docs can't silently re-drift again.
    expect(undeclared).toEqual([]);
  });
});
