import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { htmlFormat } from '@/format-packs/html';
import { markdownFormat } from '@/format-packs/markdown';
import { plainTextFormat } from '@/format-packs/plaintext';
import { portableTextMapper } from '@/lib/richtext';

/**
 * Pinning test for DCMS-869: the README documented `contentful-rtf` as a
 * richtext output format, but no mapper for it was ever implemented
 * anywhere in the codebase. This asserts the README's documented format
 * list stays a subset of the format ids the codebase can actually produce
 * (the bundled format packs + the identity Portable Text mapper), so a
 * future README edit can't reintroduce a fictitious format id without this
 * test failing.
 */

const readmePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../README.md',
);

function extractFormatLists(readme: string): string[][] {
  const matches = [...readme.matchAll(/output format \(([^)]+)\)|`Format` set \(([^)]+)\)/g)];
  expect(matches.length).toBeGreaterThan(0);
  return matches.map(match => {
    const group = match[1] ?? match[2] ?? '';
    return group
      .split(',')
      .map(id => id.trim().replace(/`/g, '').toLowerCase())
      .filter(Boolean);
  });
}

describe('richtext widget README format list', () => {
  const actualFormatIds = new Set(
    [markdownFormat.id, htmlFormat.id, plainTextFormat.id, portableTextMapper.id].map(id => id.toLowerCase()),
  );

  it('never documents contentful-rtf (no mapper exists for it)', () => {
    const readme = readFileSync(readmePath, 'utf8');
    expect(readme).not.toContain('contentful-rtf');
  });

  it('only documents format ids that are actually implemented', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const lists = extractFormatLists(readme);
    for (const list of lists) {
      expect(list.length).toBeGreaterThan(0);
      for (const id of list) {
        expect(actualFormatIds.has(id)).toBe(true);
      }
    }
  });
});
