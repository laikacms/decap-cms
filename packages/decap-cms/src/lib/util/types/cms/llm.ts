import type { CmsEntryField } from './entries.js';

/**
 * The CMS's LLM seam.
 *
 * Decap ships the *client* half of an AI integration — a chat panel, a
 * translate action, and the document access those need — and none of the
 * transport. An `LlmTransport` is supplied by the host (a prop on
 * `DecapCmsProvider`, or `CMS.registerLlmTransport` for a compiled bundle) and
 * owns everything the CMS deliberately does not: which model, which endpoint,
 * how requests are authenticated, and whether conversations are persisted.
 *
 * The split that matters is tool execution. The document being edited lives in
 * this browser's store, not on a server, so a transport that lets the model
 * call `updateDocument` executes that call against the `LlmDocumentBridge` the
 * CMS hands it. The transport never touches the store; the CMS never learns
 * the model's name.
 */

/** A single RFC 6902 JSON Patch operation. */
export interface LlmPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

/** Identifies the entry a session is about. */
export interface LlmDocumentContext {
  collection: string;
  /** Empty for an entry that has not been saved yet. */
  slug: string;
  /** Locale being edited, when the collection has i18n enabled. */
  locale?: string | undefined;
}

/**
 * What a transport is allowed to do to the open entry, implemented by the CMS
 * (`createLlmDocumentBridge`). This is the whole of the transport's access to
 * CMS state: no store, no dispatch, no internals.
 */
export interface LlmDocumentBridge {
  context: LlmDocumentContext;
  /** The open draft's data, as a plain object. */
  read(): Record<string, unknown>;
  /**
   * Apply patch operations to the draft. Operations addressing fields that do
   * not exist in the collection are skipped rather than throwing — a model can
   * hallucinate a field name, and that should not break the editor. Returns
   * the names of the fields that actually changed.
   */
  applyPatch(operations: LlmPatchOperation[]): { changed: string[] };
  /** Field definitions for the open entry, so a transport can describe the schema. */
  fields(): CmsEntryField[];
}

/**
 * A field an action offers up for translation, with its value in the source
 * locale. Structural alias of `CmsTranslatableField` so AI UI does not depend
 * on the i18n module.
 */
export interface LlmTranslatableField {
  name: string;
  value: unknown;
}

export type LlmMessageRole = 'user' | 'assistant' | 'system';

/** Tool activity worth surfacing in the transcript. */
export interface LlmToolCall {
  id: string;
  name: string;
  status: 'pending' | 'done' | 'error';
  /** Human-readable summary, e.g. 'updated title, body'. */
  summary?: string | undefined;
}

export interface LlmMessage {
  id: string;
  role: LlmMessageRole;
  /** Rendered text; a streaming transport fills this in incrementally. */
  text: string;
  toolCalls?: LlmToolCall[] | undefined;
  /** ISO timestamp, when the transport tracks one. */
  createdAt?: string | undefined;
}

export type LlmSessionStatus = 'idle' | 'streaming' | 'error';

export interface LlmSessionSummary {
  id: string;
  title?: string | undefined;
  updatedAt?: string | undefined;
  messageCount?: number | undefined;
}

export interface LlmSendPromptOptions {
  /**
   * Whether the prompt joins the transcript. `false` drives the session
   * without showing the prompt — how the translate action reuses the same
   * session as the chat panel without filling it with generated instructions.
   * Defaults to `true`.
   */
  visible?: boolean | undefined;
  /** Aborts the request; the session settles back to `idle`. */
  signal?: AbortSignal | undefined;
}

/**
 * One conversation about one document. Deliberately a subscribe/snapshot store
 * rather than a React hook, so the CMS's UI can read it through
 * `useSyncExternalStore` and stay free of any streaming library.
 */
export interface LlmSession {
  /** Set once the transport has persisted the conversation, if it does. */
  id?: string | undefined;
  messages: LlmMessage[];
  status: LlmSessionStatus;
  error?: Error | undefined;
  /** Resolves when the exchange settles (including tool round-trips). */
  sendPrompt(text: string, options?: LlmSendPromptOptions): Promise<void>;
  /** Interrupt an in-flight response. */
  stop?(): void;
  /** Called on every change to `messages`, `status` or `error`. */
  subscribe(listener: () => void): () => void;
  /** Release transport-side resources; called when the editor unmounts. */
  dispose?(): void;
}

/**
 * The host-supplied LLM connection.
 *
 * Session persistence is optional: a transport that omits `listSessions` /
 * `resumeSession` simply gets no history UI, and the panel still works.
 *
 * Authentication is deliberately absent, and stays absent. An AI endpoint is
 * not the git backend: it may well trust a different issuer, so the CMS has no
 * token to lend that would be right in general. Whoever builds the transport
 * supplies its credentials — from their own auth, or by asking the CMS for the
 * backend's token (`currentBackend(store.getState().config).getToken()`, both
 * exported from `@laikacms/decap-cms/core`) when their endpoint happens to
 * trust that one. Either way the decision is the implementor's, not the CMS's.
 *
 * If a separate identity ever has to surface in the CMS's own UI, this is where
 * `isAuthenticated` / `signIn` would go.
 */
export interface LlmTransport {
  /**
   * Open a conversation about `document`. Called once per editor mount; the
   * returned session is shared by every piece of AI UI on that screen, so a
   * translate action's prompt lands in the same conversation the chat panel
   * shows.
   */
  openSession(document: LlmDocumentBridge): LlmSession;
  /** Previous conversations about this document, newest first. */
  listSessions?(context: LlmDocumentContext): Promise<LlmSessionSummary[]>;
  /** Reopen a previous conversation, replacing the current session. */
  resumeSession?(id: string, document: LlmDocumentBridge): Promise<LlmSession>;
}
