import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// CONTRIBUTING.md lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows,
// which threw ENOENT for CONTRIBUTING.md in CI on windows-latest.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const CONTRIBUTING_PATH = path.join(REPO_ROOT, 'CONTRIBUTING.md');
const ROOT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const DECAP_CMS_PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'packages/decap-cms/package.json');
const LIB_PAT_PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'packages/decap-cms-lib-pat/package.json');

// CLI subcommands that follow `pnpm` but aren't scripts declared in
// package.json (e.g. `pnpm install`, `pnpm 9` in a version reference).
const NOT_A_SCRIPT = new Set(['install', 'workspace']);

describe('CONTRIBUTING.md#scripts', () => {
  it('only documents `pnpm <script>` commands that exist in the root package.json', () => {
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const rootPackageJson = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8')) as {
      scripts?: Record<string, string>,
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

  it('describes the full scope of `pnpm typecheck` across every packages/* workspace (DCMS-1095, #1107, DCMS-2033)', () => {
    // Root `pnpm typecheck` delegates via `pnpm -r run typecheck` to EVERY
    // workspace package's own `typecheck` script, not just decap-cms's.
    // CONTRIBUTING.md's "Available scripts" table must mention every tsconfig
    // decap-cms covers, and its total `tsc` invocation count must sum across
    // all packages/* (decap-cms-lib-pat included), so the docs can't
    // silently undersell the scope again (DCMS-2033: the count previously
    // only reflected decap-cms's own script).
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const decapCmsPackageJson = JSON.parse(
      fs.readFileSync(DECAP_CMS_PACKAGE_JSON_PATH, 'utf8'),
    ) as { scripts?: Record<string, string> };
    const typecheckScript = decapCmsPackageJson.scripts?.typecheck ?? '';
    expect(typecheckScript.length).toBeGreaterThan(0);

    const libPatPackageJson = JSON.parse(
      fs.readFileSync(LIB_PAT_PACKAGE_JSON_PATH, 'utf8'),
    ) as { scripts?: Record<string, string> };
    const libPatTypecheckScript = libPatPackageJson.scripts?.typecheck ?? '';
    expect(libPatTypecheckScript.length).toBeGreaterThan(0);

    const decapCmsInvocationCount = typecheckScript.split('&&').filter(part => part.includes('tsc')).length;
    const libPatInvocationCount = libPatTypecheckScript.split('&&').filter(part => part.includes('tsc')).length;
    const invocationCount = decapCmsInvocationCount + libPatInvocationCount;
    // Every `-p <path>` project flag after the first bare `tsc --noEmit`
    // invocation names a tsconfig the doc row should call out.
    const projectConfigs = [...typecheckScript.matchAll(/tsc\s+-p\s+(\S+)/g)].map(match => match[1]);

    expect(decapCmsInvocationCount).toBeGreaterThan(1);
    expect(projectConfigs.length).toBeGreaterThan(0);

    const typecheckRow = contributing
      .split('\n')
      .find(line => line.startsWith('| `pnpm typecheck`'));
    expect(typecheckRow).toBeDefined();

    // If this fails, either the doc row or the script drifted: update
    // whichever one is stale, and keep the other's wording in sync.
    expect(typecheckRow).toContain(String(invocationCount));
    const GENERIC_CONFIG_SEGMENTS = new Set(['tsconfig', 'json']);
    for (const configPath of projectConfigs) {
      // Match on the meaningful segment of each tsconfig path (e.g.
      // "playwright", "storybook", "node" out of "tsconfig.node.json")
      // rather than the literal path, so trivial config renames don't force
      // a doc rewrite for no reason.
      const segments = configPath.split(/[/.]/).filter(Boolean);
      const label = segments.find(segment => !GENERIC_CONFIG_SEGMENTS.has(segment.toLowerCase()))
        ?? segments[0];
      expect(typecheckRow?.toLowerCase()).toContain(label.toLowerCase());
    }
  });

  it('documents `build:dev-test` (not bare `build:demo`) as the dev-server build step (DCMS-1117, #1145)', () => {
    // `pnpm build:demo && pnpm serve:dev-test` was the documented dev workflow
    // across README.md / packages/decap-cms/README.md / CONTRIBUTING.md, but
    // `build:demo` alone never builds the Laika UI bundle
    // (`dev-test/dist/laika-cms.js`, produced by `build:laika-demo`), so pages
    // like `dev-test/laika.html` 404. `build:dev-test` is the combined script
    // that already builds every bundle the served `dev-test/` pages load —
    // assert the docs point at it instead of the classic-only command, and
    // that the script itself still covers the laika bundle so this can't
    // silently drift back apart.
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const decapCmsPackageJson = JSON.parse(
      fs.readFileSync(DECAP_CMS_PACKAGE_JSON_PATH, 'utf8'),
    ) as { scripts?: Record<string, string> };
    const devTestScript = decapCmsPackageJson.scripts?.['build:dev-test'] ?? '';

    expect(devTestScript).toContain('build:demo');
    expect(devTestScript).toContain('build:laika-demo');

    const devServerRow = contributing.split('\n').find(line => line.includes('serve:dev-test'));
    expect(devServerRow).toBeDefined();
    expect(devServerRow).toContain('build:dev-test');
    expect(devServerRow).not.toMatch(/`pnpm build:demo &&/);
  });

  it('describes `pnpm test:ci` as running a build, not just lint/typecheck/test (#2145)', () => {
    // Root `test:ci` delegates to `pnpm -r run test:ci`, and each workspace
    // package's own `test:ci` runs `pnpm run build` before lint/typecheck/test.
    // The docs previously said "lint + typecheck + unit tests", which omits
    // the build step (so a pure build break was a surprise `test:ci` failure)
    // and the root doc-consistency guard scripts. Assert both underlying
    // scripts still run a build, and that the doc row says so.
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const rootPackageJson = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8')) as {
      scripts?: Record<string, string>,
    };
    const rootTestCiScript = rootPackageJson.scripts?.['test:ci'] ?? '';
    expect(rootTestCiScript).toContain('pnpm -r run test:ci');

    const decapCmsPackageJson = JSON.parse(
      fs.readFileSync(DECAP_CMS_PACKAGE_JSON_PATH, 'utf8'),
    ) as { scripts?: Record<string, string> };
    const decapCmsTestCiScript = decapCmsPackageJson.scripts?.['test:ci'] ?? '';
    expect(decapCmsTestCiScript).toContain('pnpm run build');

    const libPatPackageJson = JSON.parse(
      fs.readFileSync(LIB_PAT_PACKAGE_JSON_PATH, 'utf8'),
    ) as { scripts?: Record<string, string> };
    const libPatTestCiScript = libPatPackageJson.scripts?.['test:ci'] ?? '';
    expect(libPatTestCiScript).toContain('pnpm run build');

    const testCiRow = contributing
      .split('\n')
      .find(line => line.startsWith('| `pnpm test:ci`'));
    expect(testCiRow).toBeDefined();

    // If this fails, the `pnpm test:ci` row stopped mentioning "build" —
    // update the wording so it accurately reflects the build step each
    // workspace package's test:ci runs before lint/typecheck/test.
    expect(testCiRow?.toLowerCase()).toContain('build');
  });

  it('documents the root `release` script in the Releasing section (#1350)', () => {
    // Root package.json#scripts.release is the only wired publish command in
    // the workspace, but the "Releasing" section used to tell contributors to
    // `npm publish` from packages/decap-cms by hand instead, silently
    // diverging from the real script. Pin both: the script must still exist,
    // and the docs must name it, so they can't drift apart again unnoticed.
    const contributing = fs.readFileSync(CONTRIBUTING_PATH, 'utf8');
    const rootPackageJson = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8')) as {
      scripts?: Record<string, string>,
    };
    const releaseScript = rootPackageJson.scripts?.release;
    expect(releaseScript).toBeDefined();

    const releasingSection = contributing.split(/^## /m).find(section => section.startsWith('Releasing'));
    expect(releasingSection).toBeDefined();

    // If this fails, either the "Releasing" section stopped mentioning
    // `pnpm release`, or the script was renamed/removed — update whichever
    // one is stale so they stay in sync.
    expect(releasingSection).toContain('pnpm release');
  });
});
