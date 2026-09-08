import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// DCMS-2027: docs/editor-guide.md's "Writing and editing an entry" section
// listed the "AI chat" panel as a plain, actively supported optional widget,
// with no hint that it's deprecated. The widget's own README already opens
// with a deprecation callout pointing at the laikacms MCP server (`/mcp`) as
// the replacement (extensions/widgets/aichat/README.md:3), and DCMS-1892
// already carried the same callout into the package README (pinned by
// aichat-readme-deprecation-doc-pin.test.ts). editor-guide.md is the doc
// actually aimed at the content editors who'd encounter this panel in the
// UI, and it never got the same treatment.
//
// DCMS-2220 (#2220) follow-up: the fix landed by DCMS-2027 conflated two
// different features under one "AI chat panel" label — the deprecated
// `ai-chat` WIDGET (extensions/widgets/aichat) and the built-in, LlmTransport-
// backed assistant panel (docs/core/llm.md, packages/decap-cms/src/core/
// components/Editor/AiChatPanel), which is a distinct, currently-supported
// feature and NOT the same thing as the MCP server. This test now pins both
// halves: the deprecation callout must name the `ai-chat` widget specifically
// (not a bare "AI chat panel"), and the doc must separately say the built-in
// LlmTransport-backed panel is not deprecated.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const editorGuidePath = path.join(REPO_ROOT, 'docs', 'editor-guide.md');

describe('editor-guide AI chat deprecation doc pin (DCMS-2027, DCMS-2220)', () => {
  const editorGuide = readFileSync(editorGuidePath, 'utf8');

  it('flags the `ai-chat` widget specifically as deprecated, not a bare "AI chat panel"', () => {
    const widgetBulletMatch = editorGuide.match(/\*\*`ai-chat`[^]*?(?=\n\n)/);

    expect(
      widgetBulletMatch,
      'Could not find an `ai-chat` widget mention in docs/editor-guide.md',
    ).not.toBeNull();

    const widgetBullet = widgetBulletMatch![0];

    expect(widgetBullet).toMatch(/ai-chat/);
    expect(widgetBullet).toMatch(/deprecat/i);
    expect(widgetBullet).toMatch(/\/mcp/);
  });

  it('does not describe a bare "AI chat panel" as the deprecated thing', () => {
    expect(editorGuide).not.toMatch(/\*\*AI chat\*\*\s*\npanel/);
    expect(editorGuide).not.toMatch(/The AI\s*\nchat panel is deprecated/);
  });

  it('states the built-in LlmTransport-backed assistant panel is separate and not deprecated', () => {
    const llmPanelMatch = editorGuide.match(/built-in AI assistant panel[^]*?(?=\n\n|$)/);

    expect(
      llmPanelMatch,
      'Could not find a built-in AI assistant panel mention in docs/editor-guide.md',
    ).not.toBeNull();

    const llmPanelSection = llmPanelMatch![0];

    expect(llmPanelSection).toMatch(/LlmTransport/);
    expect(llmPanelSection).toMatch(/core\/llm\.md/);
    expect(llmPanelSection).toMatch(/not deprecated/i);
  });
});
