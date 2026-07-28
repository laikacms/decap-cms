import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

// `pnpm build` (tsc, not tsup — see RESTRUCTURE.md "What needs verification
// before merge") mirrors `src/**` into `dist/**` file-by-file. Nothing checks
// at build time that every `package.json#exports` subpath actually resolves
// to a compiled file: a bad subpath (typo'd name, deleted `src/<name>/`,
// renamed widget) only fails at *runtime* import resolution, silently.
//
// This test is the pinning check for that: given a real `dist/` (produced by
// `pnpm build`), it asserts every exports target file exists. It's a no-op
// (skipped) on a clean checkout where `dist/` hasn't been built yet, so it
// doesn't force a build into `pnpm test` / `test:ci`. Run `pnpm build` first
// to actually exercise it.

const packageRoot = path.resolve(__dirname, '../..');
const distDir = path.join(packageRoot, 'dist');
const distExists = existsSync(distDir);

type ExportsTarget = string | { types?: string, import?: string, default?: string } | null;
const exportsMap = packageJson.exports as Record<string, ExportsTarget>;

function targetFiles(target: ExportsTarget): string[] {
  if (typeof target === 'string') return [target];
  return [target.types, target.import, target.default].filter((v): v is string => Boolean(v));
}

function isRealEntryDir(srcParentDir: string, name: string): boolean {
  const full = path.join(srcParentDir, name);
  if (!statSync(full).isDirectory()) return false;
  return existsSync(path.join(full, 'index.ts')) || existsSync(path.join(full, 'index.tsx'));
}

describe.skipIf(!distExists)('package.json#exports dist targets (post `pnpm build`)', () => {
  const subpaths = Object.keys(exportsMap).filter(key => key !== './package.json');

  for (const key of subpaths) {
    const target = exportsMap[key];

    // `null` targets (e.g. "./format-packs/mdx") are explicit blocks that
    // override a wildcard sibling — Node refuses to resolve them on
    // purpose, there's no dist file to check for.
    if (target === null) continue;

    if (!key.includes('*')) {
      it(`"${key}" resolves to files that exist in dist/`, () => {
        for (const file of targetFiles(target)) {
          const resolved = path.join(packageRoot, file);
          expect(existsSync(resolved), `expected ${file} (from exports["${key}"]) to exist`).toBe(
            true,
          );
        }
      });
      continue;
    }

    // Wildcard subpath, e.g. "./widgets/*" -> "./dist/widgets/*/index.js".
    // Enumerate the real entries under the matching src/<prefix>/ directory
    // (anything with an index.ts(x)) and assert each one's dist counterpart
    // exists — that's what actually gets imported at runtime.
    const prefix = key.replace(/^\.\//, '').replace(/\/\*$/, '');
    const srcParentDir = path.join(packageRoot, 'src', prefix);
    if (!existsSync(srcParentDir)) continue;

    const entryNames = readdirSync(srcParentDir).filter(name => isRealEntryDir(srcParentDir, name));

    it(`"${key}" has at least one entry under src/${prefix}/`, () => {
      expect(entryNames.length).toBeGreaterThan(0);
    });

    for (const name of entryNames) {
      it(`"${key}" entry "${name}" resolves to files that exist in dist/`, () => {
        for (const file of targetFiles(target)) {
          const resolved = path.join(packageRoot, file.replace('*', name));
          expect(
            existsSync(resolved),
            `expected ${file.replace('*', name)} (from exports["${key}"], entry "${name}") to exist`,
          ).toBe(true);
        }
      });
    }
  }
});
