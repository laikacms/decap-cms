import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

// `package.json#exports` declares a wildcard export for "./format-packs/*"
// that maps every subpath ./format-packs/<name> to
// ./dist/format-packs/<name>/index.js. Node's exports map matches that
// wildcard against ANY <name>, whether or not src/format-packs/<name>/
// actually has an index.ts to build it — a pack directory without a built
// index (e.g. format-packs/mdx, which is parse/attribute helpers for the
// richtext widget's mdx support, not a registrable FormatPack; see
// src/widgets/richtext/README.md) would silently resolve to nothing at
// runtime, contradicting the exports contract (DCMS-1613).
//
// This pins that every format-packs directory WITHOUT a built index.ts is
// explicitly blocked in package.json#exports (set to `null`), so the
// wildcard can never start "resolving" an unimplemented pack again, and
// that every directory WITH a built index.ts is NOT blocked.

const packageRoot = path.resolve(__dirname, '../..');
const formatPacksDir = path.join(packageRoot, 'src/format-packs');
const exportsMap = packageJson.exports as Record<string, unknown>;

const packNames = readdirSync(formatPacksDir).filter(name =>
  statSync(path.join(formatPacksDir, name)).isDirectory()
);

describe('package.json#exports "./format-packs/*" only resolves implemented packs (DCMS-1613)', () => {
  it('found at least one format pack directory to check', () => {
    expect(packNames.length).toBeGreaterThan(0);
  });

  for (const name of packNames) {
    const hasIndex = existsSync(path.join(formatPacksDir, name, 'index.ts'));
    const literalKey = `./format-packs/${name}`;

    if (hasIndex) {
      it(`"${literalKey}" is not blocked (pack has a built index.ts)`, () => {
        expect(exportsMap[literalKey]).not.toBe(null);
      });
    } else {
      it(`"${literalKey}" is explicitly blocked via exports["${literalKey}"] = null (no index.ts yet)`, () => {
        expect(literalKey in exportsMap).toBe(true);
        expect(exportsMap[literalKey]).toBe(null);
      });
    }
  }
});
