import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-2285/#2288: the uploadcare media library README cites specific
// `index.ts` line numbers for the code it describes (e.g. "index.ts:66-69"
// for the `console.warn` call). Those citations drifted out of sync with the
// source as unrelated edits shifted lines around, and nothing caught it.
//
// This pins each cited line/range to the source snippet it's supposed to
// point at, so a future line shift that isn't reflected in the README fails
// this test instead of silently going stale again.

const packageDir = path.resolve(__dirname, '..', 'media', 'library-uploadcare');
const readmePath = path.join(packageDir, 'README.md');
const indexPath = path.join(packageDir, 'index.ts');

function getLines(source: string, start: number, end: number = start) {
  // Line numbers in the README are 1-indexed and inclusive.
  return source
    .split('\n')
    .slice(start - 1, end)
    .join('\n');
}

describe('uploadcare README index.ts line citations doc pin (DCMS-2285/#2288)', () => {
  const indexSource = readFileSync(indexPath, 'utf8');

  it('README cites the current index.ts line numbers, not drifted ones', () => {
    const readme = readFileSync(readmePath, 'utf8');

    expect(readme).toContain('index.ts:116');
    expect(readme).toContain('index.ts:113-114');
    expect(readme).toContain('index.ts:68-70');
    expect(readme).toContain('index.ts:10-13');

    // Guard against the specific drifted citations this fix corrected.
    expect(readme).not.toContain('index.ts:112,115');
    expect(readme).not.toContain('index.ts:112-113');
    expect(readme).not.toContain('index.ts:66-69');
  });

  it('index.ts:116 sets window.UPLOADCARE_PUBLIC_KEY from the destructured publicKey', () => {
    expect(getLines(indexSource, 116)).toContain('window.UPLOADCARE_PUBLIC_KEY = publicKey');
  });

  it('index.ts:113-114 destructures publicKey out and merges the remaining config over defaultConfig', () => {
    const snippet = getLines(indexSource, 113, 114);

    expect(snippet).toContain('const { publicKey, ...globalConfig } = options.config');
    expect(snippet).toContain('const baseConfig = { ...defaultConfig, ...globalConfig };');
  });

  it('index.ts:68-70 logs the console.warn for a defaultOperations value missing a leading slash', () => {
    const snippet = getLines(indexSource, 68, 70);

    expect(snippet).toContain('console.warn(');
    expect(snippet).toContain('Uploadcare default operations should start with');
  });

  it('index.ts:10-13 defines the defaultConfig object', () => {
    const snippet = getLines(indexSource, 10, 13);

    expect(snippet).toContain('const defaultConfig = {');
    expect(snippet).toContain('previewStep: true');
    expect(snippet).toContain('integration: USER_AGENT');
  });
});
