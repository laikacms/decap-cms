import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-2374: README/index.ts/useAiTranslate cited the pre-split path
// `src/widgets/aichat/...` and off-by-one `AiChatControl.tsx:N` lines.

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

const readmePath = 'extensions/widgets/aichat/README.md';
const indexPath = 'extensions/widgets/aichat/src/index.ts';
const translatePath = 'extensions/editor/ai-translate/src/useAiTranslate.ts';
const controlPath = 'extensions/widgets/aichat/src/AiChatControl.tsx';

describe('aichat doc pin (DCMS-2374)', () => {
  it.each([readmePath, indexPath, translatePath])('%s has no stale src/widgets/aichat path', rel => {
    expect(read(rel)).not.toContain('src/widgets/aichat');
  });

  it('cited AiChatControl.tsx lines contain the named symbols', () => {
    const lines = read(controlPath).split('\n');
    const readme = read(readmePath);
    const cite = (n: number) => lines[n - 1];

    const cites = [...readme.matchAll(/AiChatControl\.tsx:(\d+)/g)].map(m => Number(m[1]));
    expect(cites.length).toBeGreaterThanOrEqual(3);
    const [decl, read_, applied] = cites;
    expect(cite(decl)).toContain('maxHeight?: string');
    expect(cite(read_)).toContain("field.maxHeight || '500px'");
    expect(cite(applied)).toContain('maxHeight');
    expect(cite(applied)).toContain('Container');
  });
});
