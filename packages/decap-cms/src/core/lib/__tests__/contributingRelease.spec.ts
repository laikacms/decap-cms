import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * CONTRIBUTING.md's "Releasing" section (DCMS-1585) quotes the root
 * `package.json`'s `release` / `version-packages` script bodies verbatim, and
 * documents `pnpm changeset` as the step contributors take to add a
 * changeset entry. Nothing previously caught drift between the documented
 * commands and the actual scripts (DCMS-1585: the doc had gone stale,
 * describing a manual `pnpm -r publish --publish-branch v4.beta` flow that
 * changesets had already replaced). This test pins both sides so a future
 * change to either the scripts or the docs fails CI instead of silently
 * going stale.
 *
 * When this test fails: update whichever of CONTRIBUTING.md / package.json
 * scripts changed, then update the expected strings below to match.
 */

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../..');

const packageJsonPath = path.resolve(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>;
};

const contributingMd = readFileSync(path.resolve(repoRoot, 'CONTRIBUTING.md'), 'utf8');

const expectedScripts = {
  changeset: 'changeset',
  'version-packages': 'changeset version',
  release: 'node scripts/assert-release-branch.mjs && changeset publish',
};

describe('CONTRIBUTING.md Releasing section matches root package.json scripts (DCMS-1585)', () => {
  it('root package.json has the expected changeset/release script bodies', () => {
    const scripts = packageJson.scripts ?? {};
    expect(scripts.changeset).toBe(expectedScripts.changeset);
    expect(scripts['version-packages']).toBe(expectedScripts['version-packages']);
    expect(scripts.release).toBe(expectedScripts.release);
  });

  it('CONTRIBUTING.md quotes the actual version-packages and release script bodies', () => {
    expect(contributingMd).toContain(expectedScripts['version-packages']);
    expect(contributingMd).toContain(expectedScripts.release);
  });

  it('CONTRIBUTING.md documents pnpm changeset in the PR checklist', () => {
    expect(contributingMd).toMatch(/pnpm changeset/);
  });

  it('CONTRIBUTING.md documents the assert-release-branch.mjs branch guard', () => {
    expect(contributingMd).toContain('scripts/assert-release-branch.mjs');
  });
});
