import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-1892: the package README listed the "AI chat" bullet as a plain
// active fork feature alongside richtext/base-ui, with no mention that the
// `ai-chat` widget is deprecated. A reader who only read the root package
// README had no forewarning before hitting the deprecation warning/removal
// later.
//
// The replacement changed since: the CMS now ships the chat itself, as an
// editor panel over the `LlmTransport` seam, and the widget's job moved to a
// transport implementation (`extensions/llm/dulla`). So the bullet must still
// carry the deprecation, and must point at what replaced it rather than
// leaving a reader to find out from the widget's own README.

const packageRoot = path.resolve(__dirname, '..', '..');
const readmePath = path.join(packageRoot, 'README.md');

describe('ai-chat README deprecation doc pin (DCMS-1892)', () => {
  it('package README flags the AI chat widget as deprecated and names its replacement', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const aiBulletMatch = readme.match(/-\s+\*\*AI [^]*?(?=\n- \*\*|\n## )/);

    expect(
      aiBulletMatch,
      'Could not find the "AI ..." bullet in packages/decap-cms/README.md',
    ).not.toBeNull();

    const aiBullet = aiBulletMatch![0];

    expect(aiBullet).toMatch(/deprecat/i);
    expect(aiBullet).toMatch(/aichat/);
    expect(aiBullet).toMatch(/LlmTransport/);
  });
});
