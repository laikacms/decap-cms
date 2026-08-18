import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-2147: packages/decap-cms/README.md documents, in the same sentence as
// the `ai-chat` widget's deprecation, that the standalone `ai-translate`
// action is also deprecated. The `ai-chat` widget backs that claim at every
// level a consumer would see it (npm `deprecated` keyword, runtime
// console.warn, `@deprecated` JSDoc). `ai-translate` had none of that until
// now.
//
// This pins the fix: the package.json `keywords` array must carry the
// `deprecated` marker, and the package README must carry a deprecation
// callout naming the in-core replacement.

const packageRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = path.join(packageRoot, 'package.json');
const readmePath = path.join(packageRoot, 'README.md');

describe('ai-translate deprecation markers (DCMS-2147)', () => {
  it('package.json keywords include "deprecated"', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { keywords?: string[] };

    expect(Array.isArray(pkg.keywords)).toBe(true);
    expect(pkg.keywords).toContain('deprecated');
  });

  it('README carries a deprecation callout pointing at AiTranslateAction', () => {
    const readme = readFileSync(readmePath, 'utf8');

    expect(readme).toMatch(/deprecated/i);
    expect(readme).toMatch(/AiTranslateAction/);
  });
});
