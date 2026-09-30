import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * DCMS-2401: stringTemplate.ts cited a nonexistent docs/beta-features/slug.md
 * for the local-timezone date contract. Any repo-relative docs/... path cited
 * in a source comment under lib/widgets must resolve to a real file.
 */

const widgetsDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const repoRoot = path.resolve(widgetsDir, '../../../../..');

const citedDocPath = /(?<![\w./-])docs\/[\w./-]*[\w-]\.[a-z]+/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function commentLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => /^\s*(\/\/|\/?\*)/.test(line));
}

describe('docs cited in lib/widgets source comments (DCMS-2401)', () => {
  const citations = sourceFiles(widgetsDir).flatMap(file =>
    commentLines(file).flatMap(line =>
      (line.match(citedDocPath) ?? []).map(doc => ({
        file: path.relative(repoRoot, file),
        doc,
      })),
    ),
  );

  it('finds at least one citation so the scan is not vacuous', () => {
    expect(citations.length).toBeGreaterThan(0);
  });

  it.each(citations)('$file cites existing $doc', ({ doc }) => {
    expect(existsSync(path.join(repoRoot, doc))).toBe(true);
  });
});
