import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

// RESTRUCTURE.md lives at the repo root, four levels up from this test file
// (src/__tests__ -> src -> packages/decap-cms -> packages -> repo root).
// Anchor on import.meta.url instead of __dirname: the __dirname shim vitest
// injects for ESM sources resolves to a different segment count on Windows.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const RESTRUCTURE_MD_PATH = path.join(REPO_ROOT, 'RESTRUCTURE.md');

describe('RESTRUCTURE.md subpath count', () => {
  it('quotes the same subpath count everywhere it mentions one (DCMS-1114)', () => {
    const keys = Object.keys(packageJson.exports as Record<string, unknown>);
    const nonSubpathKeys = ['.', './package.json'];
    const liveCount = keys.filter(key => !nonSubpathKeys.includes(key)).length;

    const doc = fs.readFileSync(RESTRUCTURE_MD_PATH, 'utf8');

    // Matches "46 subpath exports", "24 subpaths", etc. so any figure quoted
    // in the doc is checked against the live package.json#exports count. If
    // this fails, either RESTRUCTURE.md's figure is stale (update it to match
    // liveCount) or package.json#exports gained/lost a subpath (update the
    // doc's wording to match the new reality).
    const matches = [...doc.matchAll(/(\d+)\s+subpaths?(?:\s+exports?)?/gi)];
    const quotedCounts = matches.map(match => Number(match[1]));

    expect(quotedCounts.length).toBeGreaterThan(0);

    for (const quoted of quotedCounts) {
      expect(quoted).toBe(liveCount);
    }
  });
});
