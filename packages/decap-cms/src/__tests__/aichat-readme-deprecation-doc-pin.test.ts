import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// DCMS-1892: the package README listed the "AI chat" bullet as a plain
// active fork feature alongside richtext/base-ui, with no mention that the
// `ai-chat` widget is deprecated. The widget's own README already opens
// with a deprecation callout pointing at the laikacms MCP server (`/mcp`)
// as the replacement (packages/decap-cms/src/widgets/aichat/README.md:3),
// and `warnDeprecated()` fires on every widget registration
// (packages/decap-cms/src/widgets/aichat/index.ts:20). A reader who only
// reads the root package README had no forewarning before hitting the
// deprecation warning/removal later.
//
// This pins the fix: the "AI chat" bullet in the package README must carry
// a deprecation callout.

const packageRoot = path.resolve(__dirname, '..', '..');
const readmePath = path.join(packageRoot, 'README.md');

describe('ai-chat README deprecation doc pin (DCMS-1892)', () => {
  it('package README flags the AI chat bullet as deprecated', () => {
    const readme = readFileSync(readmePath, 'utf8');
    const aiChatBulletMatch = readme.match(/-\s+\*\*AI chat[^]*?(?=\n- \*\*|\n## )/);

    expect(
      aiChatBulletMatch,
      'Could not find the "AI chat" bullet in packages/decap-cms/README.md',
    ).not.toBeNull();

    const aiChatBullet = aiChatBulletMatch![0];

    expect(aiChatBullet).toMatch(/deprecat/i);
    expect(aiChatBullet).toMatch(/\/mcp/);
  });
});
