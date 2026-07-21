import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// DCMS-1233: `BREAKING_CHANGES_V2_BETA.md`'s "GraphQL client libraries are
// now optional peer dependencies" migration snippet used to tell adopters to
// `pnpm add @apollo/client rxjs graphql graphql-tag`, but `rxjs` is not
// declared anywhere in `packages/decap-cms/package.json` (not a peer dep,
// not a dep, not a devDep) and nothing under `packages/decap-cms/src`
// imports it. Installing it per the doc pulled in a package the CMS never
// asks for and never uses.
//
// This test pins both halves of that contract so a regression on either
// side (doc re-adds `rxjs`, or code starts depending on it without
// declaring the peer) fails CI:
//   1. `rxjs` must not appear in `package.json` dependencies /
//      devDependencies / peerDependencies / peerDependenciesMeta.
//   2. `rxjs` must not appear in the doc's GraphQL migration `pnpm add`
//      line.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');

const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'packages/decap-cms/package.json');
const BREAKING_CHANGES_DOC_PATH = path.join(REPO_ROOT, 'BREAKING_CHANGES_V2_BETA.md');

describe('rxjs is not part of the @laikacms/decap-cms GraphQL contract (DCMS-1233)', () => {
  it('is absent from packages/decap-cms/package.json dependency fields', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    const dependencyFields = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'peerDependenciesMeta',
      'optionalDependencies',
    ] as const;

    const offenders = dependencyFields.filter(field => {
      const value = pkg[field];
      return value && Object.prototype.hasOwnProperty.call(value, 'rxjs');
    });

    // If this fails, something re-added `rxjs` to package.json. Either it's
    // genuinely needed now (in which case BREAKING_CHANGES_V2_BETA.md's
    // migration snippet should list it again), or it's an accidental/stale
    // entry that should be removed.
    expect(offenders).toEqual([]);
  });

  it('is never imported anywhere under packages/decap-cms/src', () => {
    const srcDir = path.join(REPO_ROOT, 'packages/decap-cms/src');
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const contents = fs.readFileSync(fullPath, 'utf8');
          if (/(?:from\s+|require\(\s*)['"]rxjs(?:\/[^'"]*)?['"]/.test(contents)) {
            offenders.push(path.relative(REPO_ROOT, fullPath));
          }
        }
      }
    };
    walk(srcDir);

    expect(offenders).toEqual([]);
  });

  it("is absent from BREAKING_CHANGES_V2_BETA.md's GraphQL migration `pnpm add` line", () => {
    const contents = fs.readFileSync(BREAKING_CHANGES_DOC_PATH, 'utf8');

    const pnpmAddLines = contents
      .split('\n')
      .filter(line => /^\s*pnpm add .*@apollo\/client/.test(line));

    expect(pnpmAddLines.length).toBeGreaterThan(0);

    const offenders = pnpmAddLines.filter(line => /\brxjs\b/.test(line));

    // If this fails, the doc's GraphQL migration snippet tells adopters to
    // install `rxjs` again. Only re-add it if the package genuinely depends
    // on it (and declares it as a peer dependency) — otherwise drop it from
    // the `pnpm add` line.
    expect(offenders).toEqual([]);
  });
});
