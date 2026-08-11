/**
 * @laikacms/decap-cms/ai
 *
 * AI chat integration for Decap CMS. Bundles the Vercel AI SDK so consumers
 * get a single, shared `ai` runtime - re-export `tool`, model factories, and
 * runtime helpers from this package instead of importing `'ai'` or
 * `'@ai-sdk/*'` directly to avoid duplicate-package brand-symbol mismatches.
 *
 * @example
 * ```typescript
 * import { decapAi, jsonSchema, tool } from '@laikacms/decap-cms/ai';
 * import { anthropic } from '@laikacms/decap-cms/ai/providers';
 *
 * // authenticateAccessToken should route through the resolveBearer seam
 * // (decap-cms-lib-pat's resolveBearer, or the equivalent laikacms/auth
 * // implementation server-side) and forward its scopes:
 * //   const ctx = await resolveBearer(token, { verifySessionToken, lookupPatByHash });
 * //   if (!ctx) throw new Error('Unauthorized');
 * //   return { ...ctx.user, email: ctx.user.email, scopes: ctx.scopes };
 * const ai = decapAi({
 *   authenticateAccessToken: async (token) => ({ id: '1', email: 'u@x' }),
 *   model: anthropic('claude-3-5-sonnet-20241022'),
 *   callbacks: { ... },
 *   tools: {
 *     hello: tool({
 *       description: 'say hi',
 *       inputSchema: jsonSchema({
 *         type: 'object',
 *         properties: {},
 *         additionalProperties: false,
 *       }),
 *       execute: async () => ({ greeting: 'hi' }),
 *     }),
 *   },
 * });
 * ```
 */

export { decapAi, default } from './decap-ai.js';

export type {
  AiMessage,
  AiSession,
  AiSessionCallbacks,
  ChatRequest,
  DecapAi,
  DecapAiConfig,
  DocumentContext,
  Logger,
  SessionDetailResponse,
  SessionListResponse,
  User,
} from './types.js';

export { documentTools } from './tools/index.js';

export type { Translation, TranslationKey } from './i18n/types.js';

// ---------------------------------------------------------------------------
// Re-export the resolveBearer -> { user, scopes } seam from decap-cms-lib-pat
// so `authenticateAccessToken` implementations and `requiredScope` can be
// built without a separate dependency on decap-cms-lib-pat.
// ---------------------------------------------------------------------------

export {
  ADMIN_SCOPE,
  hasScope,
  InsufficientScopeError,
  requireScope,
  resolveBearer,
  UnauthorizedError,
} from 'decap-cms-lib-pat';

export type { AuthContext, Scope } from 'decap-cms-lib-pat';

// ---------------------------------------------------------------------------
// Re-exports from the AI SDK runtime so consumers do not import `ai` or
// `@ai-sdk/*` directly. This guarantees a single physical `ai` package in the
// consumer's node_modules and keeps the branded schema/tool types consistent.
// ---------------------------------------------------------------------------

export {
  convertToModelMessages,
  DefaultChatTransport,
  generateId,
  isTextUIPart,
  isToolUIPart,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  streamText,
  tool,
} from 'ai';

export type { LanguageModel, ToolSet } from 'ai';
