import { AiChatControl } from './AiChatControl';
import { AiChatPreview } from './AiChatPreview';
import schema from './schema';

import type { AiChatWidgetOptions } from './types';

export { AiChatControl } from './AiChatControl';
export { AiChatPreview } from './AiChatPreview';
export type { AiChatWidgetOptions, DocumentContext, SessionSummary } from './types';

// i18n exports
export type { Translation, TranslationKey } from './i18n/types';

// React AI SDK runtime re-exports; keeps consumers off direct `@ai-sdk/react`.
export { useChat } from '@ai-sdk/react';
export type { UIMessage } from '@ai-sdk/react';

let deprecationWarned = false;

function warnDeprecated() {
  if (deprecationWarned || typeof console === 'undefined') return;
  deprecationWarned = true;
  console.warn(
    '[decap-cms] The `ai-chat` widget is deprecated. It was a client-side stopgap for editing '
      + 'an open entry, which the server-side laikacms MCP (`/mcp`) cannot reach today. Prefer the '
      + 'MCP integration for AI-assisted editing; the widget stays only until a client bridge lets '
      + 'MCP edit an open entry. See src/widgets/aichat/README.md.',
  );
}

/**
 * @deprecated The `ai-chat` widget is a client-side stopgap and is being phased out in favor of
 * the laikacms MCP server (`/mcp`). It exists only because server-side MCP has no access to the
 * open entry's client-side draft state; once a client bridge closes that gap the widget will be
 * removed. Still fully functional for now. See `src/widgets/aichat/README.md`.
 */
function Widget(opts: AiChatWidgetOptions = {}) {
  warnDeprecated();
  return {
    name: 'ai-chat',
    controlComponent: AiChatControl,
    previewComponent: AiChatPreview,
    schema,
    ...opts,
  };
}

/**
 * @deprecated The `ai-chat` widget is a client-side stopgap and is being phased out in favor of
 * the laikacms MCP server (`/mcp`). See `src/widgets/aichat/README.md`.
 */
export const DecapCmsWidgetAiChat = {
  name: 'ai-chat',
  Widget,
  controlComponent: AiChatControl,
  previewComponent: AiChatPreview,
};

// Kept for consumers migrating from @laikacms/decap-ai/widget.
export const WidgetAiChat = DecapCmsWidgetAiChat;

export default DecapCmsWidgetAiChat;
