import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `docs/contributing/learnings/dcb-001-pnpm-install.md` (DCMS-1557) documents the
 * `peerDependencies` / `peerDependenciesMeta` block of
 * `packages/decap-cms/package.json` as of a pinned commit, with a lifecycle
 * note that it must be re-verified whenever that block changes. Nothing
 * previously caught drift automatically (DCMS-1560: PR #1550 added `zod`
 * without the doc being updated). This test pins the current peer set so a
 * future change to either block fails CI instead of silently going stale.
 *
 * When this test fails: update the peer set below, re-run the `pnpm install`
 * verification, and refresh `docs/contributing/learnings/dcb-001-pnpm-install.md`
 * (Verified on date/commit + peer table) to match.
 */

const packageJsonPath = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../../../package.json',
);
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  peerDependencies?: Record<string, string>,
  peerDependenciesMeta?: Record<string, { optional?: boolean }>,
};

const expectedRequiredPeers = ['@emotion/react', '@emotion/styled', 'react', 'react-dom'].sort();

const expectedOptionalPeers = [
  '@apollo/client',
  '@radix-ui/react-icons',
  'graphql',
  'graphql-tag',
  'lucide-react',
  'ol',
  'uploadcare-widget',
  'uploadcare-widget-tab-effects',
  'zod',
].sort();

describe('packages/decap-cms/package.json peerDependencies (DCB-001, DCMS-1560)', () => {
  it('has the expected required peer set', () => {
    const peerDependencies = packageJson.peerDependencies ?? {};
    const optionalKeys = new Set(
      Object.entries(packageJson.peerDependenciesMeta ?? {})
        .filter(([, meta]) => meta?.optional)
        .map(([name]) => name),
    );
    const requiredKeys = Object.keys(peerDependencies)
      .filter(name => !optionalKeys.has(name))
      .sort();

    expect(requiredKeys).toEqual(expectedRequiredPeers);
  });

  it('has the expected optional peer set (peerDependenciesMeta)', () => {
    const optionalKeys = Object.entries(packageJson.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta?.optional)
      .map(([name]) => name)
      .sort();

    expect(optionalKeys).toEqual(expectedOptionalPeers);
  });

  it('every optional peer in peerDependenciesMeta is also declared in peerDependencies', () => {
    const peerDependencies = packageJson.peerDependencies ?? {};
    const optionalKeys = Object.keys(packageJson.peerDependenciesMeta ?? {});

    for (const name of optionalKeys) {
      expect(peerDependencies, `peerDependenciesMeta."${name}" has no matching peerDependencies entry`)
        .toHaveProperty(name);
    }
  });
});
