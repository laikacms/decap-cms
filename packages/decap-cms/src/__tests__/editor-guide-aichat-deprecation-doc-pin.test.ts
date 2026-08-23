import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// DCMS-2027: docs/editor-guide.md's "Writing and editing an entry" section
// listed the "AI chat" panel as a plain, actively supported optional widget,
// with no hint that it's deprecated. The widget's own README already opens
// with a deprecation callout pointing at an MCP server (`/mcp`) as
// the replacement (packages/decap-cms/src/widgets/aichat/README.md:3), and
// DCMS-1892 already carried the same callout into the package README
// (pinned by aichat-readme-deprecation-doc-pin.test.ts). editor-guide.md is
// the doc actually aimed at the content editors who'd encounter this panel
// in the UI, and it never got the same treatment.
//
// This pins the fix: the "AI chat" bullet in docs/editor-guide.md must carry
// a deprecation callout mentioning the MCP replacement.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const editorGuidePath = path.join(REPO_ROOT, 'docs', 'editor-guide.md');

describe('editor-guide AI chat deprecation doc pin (DCMS-2027)', () => {
  it('docs/editor-guide.md flags the AI chat bullet as deprecated', () => {
    const editorGuide = readFileSync(editorGuidePath, 'utf8');
    const aiChatBulletMatch = editorGuide.match(/\*\*AI chat\*\*[^]*?(?=\n\n|\n##)/);

    expect(
      aiChatBulletMatch,
      'Could not find the "AI chat" panel mention in docs/editor-guide.md',
    ).not.toBeNull();

    const aiChatBullet = aiChatBulletMatch![0];

    expect(aiChatBullet).toMatch(/deprecat/i);
    expect(aiChatBullet).toMatch(/\/mcp/);
  });
});
