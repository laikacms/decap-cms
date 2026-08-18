import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-2124: the root README.md "Repository layout" section presented an
// ASCII tree covering `packages/` and `docs/`, but omitted the top-level
// `extensions/` directory entirely - even though `extensions/` is a
// first-class root (`extensions/editor`, `extensions/llm`,
// `extensions/widgets`) that docs/core/llm.md and docs/community-widgets.md
// both point readers at as if they already knew it existed. This pins the
// "Repository layout" code block so it keeps introducing `extensions/`.

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const readmePath = path.join(repoRoot, 'README.md');

describe('README repository layout doc pin (DCMS-2124)', () => {
  it('root README "Repository layout" code block mentions extensions/', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const layoutSectionMatch = readme.match(
      /## Repository layout\n\n```([^]*?)```/,
    );

    expect(
      layoutSectionMatch,
      'Could not find the "Repository layout" code block in root README.md',
    ).not.toBeNull();

    const layoutBlock = layoutSectionMatch![1];

    expect(layoutBlock).toContain('extensions/');
  });
});
