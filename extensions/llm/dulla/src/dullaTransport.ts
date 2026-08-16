import { AbstractChat, DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

import { fromStoredMessages, HIDDEN_METADATA_KEY, toLlmMessages } from './messages';

import type {
  LlmDocumentBridge,
  LlmDocumentContext,
  LlmMessage,
  LlmPatchOperation,
  LlmSendPromptOptions,
  LlmSession,
  LlmSessionStatus,
  LlmSessionSummary,
  LlmTransport,
} from '@laikacms/decap-cms/lib/util';
import type { ChatState, ChatStatus, UIDataTypes, UIMessage } from 'ai';

/**
 * Dulla: Laika's implementation of the CMS's `LlmTransport`, talking to
 * `@laikacms/server/ai` (`POST {basePath}/chat` plus the session endpoints).
 *
 * The division of labour is the point. The server owns the model, the system
 * prompt and session persistence. Dulla owns the wire: streaming, auth headers,
 * and executing the two document tools the server deliberately ships without an
 * `execute` — those run here, against the `LlmDocumentBridge` the CMS hands in,
 * because the entry being edited lives in this browser's store. The CMS itself
 * owns none of it and has no AI dependency at all.
 */

/**
 * The tools `@laikacms/server/ai` declares without an `execute`. A type alias
 * rather than an interface on purpose: only aliases get the implicit index
 * signature that satisfies the SDK's `UITools` (`Record<string, UITool>`), and
 * naming the two tools here is what makes `addToolOutput` type-check without a
 * cast.
 */
type DullaTools = {
  getDocumentData: {
    input: Record<string, never>,
    output: {
      success: true,
      slug: string,
      collection: string,
      locale?: string | undefined,
      data: Record<string, unknown>,
    },
  },
  updateDocument: {
    input: { operations: LlmPatchOperation[] },
    output: { success: true, changed: string[] } | { success: false, error: string },
  },
};

type DullaUIMessage = UIMessage<unknown, UIDataTypes, DullaTools>;

export interface DullaTransportOptions {
  /**
   * Base path the AI endpoints are mounted at. Defaults to `/api/ai`, matching
   * `decapAi()`'s own default.
   */
  apiBasePath?: string | undefined;
  /** Injectable fetch, for a custom base URL, credentials mode, or tests. */
  fetch?: typeof fetch | undefined;
  /**
   * Bearer token for the AI endpoints, resolved per request so a refreshed
   * token is picked up.
   *
   * Deliberately yours to supply: an AI endpoint is not the git backend and
   * need not trust the same issuer, so Dulla never goes looking for a token on
   * its own. When your endpoint does trust the CMS's backend token, hand it
   * over explicitly:
   *
   * ```ts
   * import { currentBackend, store } from '@laikacms/decap-cms/core';
   *
   * createDullaTransport({
   *   getToken: () => currentBackend(store.getState().config).getToken(),
   * });
   * ```
   *
   * Omit it entirely for cookie-based auth or an endpoint on the same origin
   * that needs none: no `Authorization` header is sent.
   */
  getToken?: (() => string | null | undefined | Promise<string | null | undefined>) | undefined;
  /** Extra fields merged into every `/chat` request body. */
  body?: Record<string, unknown> | undefined;
  /** Called for every transport-level failure, in addition to surfacing on the session. */
  onError?: ((error: Error) => void) | undefined;
}

const DEFAULT_BASE_PATH = '/api/ai';

/**
 * Sessions are stored per document slug. Qualifying it with the collection
 * keeps two entries that share a slug in different collections from sharing a
 * conversation history.
 */
function documentKey(context: LlmDocumentContext): string {
  return context.collection ? `${context.collection}/${context.slug}` : context.slug;
}

/** Wraps a fetch with the bearer header, and reports back any session id the server assigned. */
function createAuthedFetch(
  options: DullaTransportOptions,
  onSessionId?: (id: string) => void,
): typeof fetch {
  const baseFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const getToken = options.getToken;

  return async (input, init) => {
    const token = await getToken?.();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await baseFetch(input, { ...init, headers });

    const sessionId = response.headers.get('X-Session-Id');
    if (sessionId && onSessionId) {
      onSessionId(sessionId);
    }

    return response;
  };
}

/**
 * The `ChatState` the SDK mutates as a response streams in. `AbstractChat`
 * assigns to `status` / `error` and calls the message methods, so every one of
 * them funnels into a single `notify` - which is exactly the shape
 * `LlmSession.subscribe` wants.
 */
class DullaChatState implements ChatState<DullaUIMessage> {
  #status: ChatStatus = 'ready';
  #error: Error | undefined = undefined;
  #messages: DullaUIMessage[];
  readonly #notify: () => void;

  constructor(initialMessages: DullaUIMessage[], notify: () => void) {
    this.#messages = initialMessages;
    this.#notify = notify;
  }

  get status(): ChatStatus {
    return this.#status;
  }

  set status(status: ChatStatus) {
    this.#status = status;
    this.#notify();
  }

  get error(): Error | undefined {
    return this.#error;
  }

  set error(error: Error | undefined) {
    this.#error = error;
    this.#notify();
  }

  get messages(): DullaUIMessage[] {
    return this.#messages;
  }

  set messages(messages: DullaUIMessage[]) {
    this.#messages = messages;
    this.#notify();
  }

  pushMessage = (message: DullaUIMessage) => {
    this.#messages = this.#messages.concat(message);
    this.#notify();
  };

  popMessage = () => {
    this.#messages = this.#messages.slice(0, -1);
    this.#notify();
  };

  replaceMessage = (index: number, message: DullaUIMessage) => {
    this.#messages = [
      ...this.#messages.slice(0, index),
      // Cloned like @ai-sdk/react does: parts are mutated in place while
      // streaming, and a consumer that memoizes on identity must see a change.
      this.snapshot(message),
      ...this.#messages.slice(index + 1),
    ];
    this.#notify();
  };

  snapshot = <T>(value: T): T => structuredClone(value);
}

class DullaChat extends AbstractChat<DullaUIMessage> {}

function toSessionStatus(status: ChatStatus): LlmSessionStatus {
  if (status === 'submitted' || status === 'streaming') return 'streaming';
  if (status === 'error') return 'error';
  return 'idle';
}

class DullaSession implements LlmSession {
  #chat: DullaChat;
  #state: DullaChatState;
  #sessionId: string | undefined;
  #listeners = new Set<() => void>();
  /** Cached projection, invalidated by the SDK message array's identity. */
  #projectionSource: readonly DullaUIMessage[] | undefined = undefined;
  #projection: LlmMessage[] = [];

  constructor(
    document: LlmDocumentBridge,
    options: DullaTransportOptions,
    initial?: { sessionId?: string | undefined, messages?: DullaUIMessage[] | undefined },
  ) {
    this.#sessionId = initial?.sessionId;

    const notify = () => this.#listeners.forEach(listener => listener());
    this.#state = new DullaChatState(initial?.messages ?? [], notify);

    const basePath = options.apiBasePath ?? DEFAULT_BASE_PATH;
    const authedFetch = createAuthedFetch(options, id => {
      this.#sessionId = id;
    });

    this.#chat = new DullaChat({
      state: this.#state,
      transport: new DefaultChatTransport<DullaUIMessage>({
        api: `${basePath}/chat`,
        fetch: authedFetch,
        body: () => ({
          ...options.body,
          sessionId: this.#sessionId ?? null,
          document: {
            slug: documentKey(document.context),
            collection: document.context.collection,
            locale: document.context.locale,
          },
        }),
      }),
      onToolCall: ({ toolCall }) => this.#executeTool(document, toolCall),
      onError: error => options.onError?.(error),
      // Client-side tools resolve locally, so the turn has to be sent back for
      // the model to see their output. Without this the conversation stalls
      // right after a tool call.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });
  }

  get id(): string | undefined {
    return this.#sessionId;
  }

  get messages(): LlmMessage[] {
    const source = this.#state.messages;
    if (source !== this.#projectionSource) {
      this.#projectionSource = source;
      this.#projection = toLlmMessages(source);
    }
    return this.#projection;
  }

  get status(): LlmSessionStatus {
    return toSessionStatus(this.#state.status);
  }

  get error(): Error | undefined {
    return this.#state.error;
  }

  async sendPrompt(text: string, options: LlmSendPromptOptions = {}): Promise<void> {
    // A previous failure must not make this send look failed too.
    this.#chat.clearError();

    // The SDK takes no per-request signal, so an abort is wired to the same
    // `stop()` the panel's stop button uses.
    const signal = options.signal;
    const abort = () => this.stop();
    signal?.addEventListener('abort', abort, { once: true });

    try {
      await this.#chat.sendMessage(
        options.visible === false
          ? { text, metadata: { [HIDDEN_METADATA_KEY]: true } }
          : { text },
      );
    } finally {
      signal?.removeEventListener('abort', abort);
    }

    // The SDK reports failures on the chat rather than by rejecting; the CMS's
    // UI expects a rejection, so hand the error back to the caller too.
    const error = this.#state.error;
    if (error) {
      throw error;
    }
  }

  stop(): void {
    void this.#chat.stop();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    void this.#chat.stop();
    this.#listeners.clear();
  }

  #executeTool(
    document: LlmDocumentBridge,
    toolCall: { toolCallId: string, toolName: string, input: unknown },
  ): void {
    const { toolCallId, toolName } = toolCall;

    if (toolName === 'getDocumentData') {
      this.#chat.addToolOutput({
        tool: 'getDocumentData',
        toolCallId,
        state: 'output-available',
        output: {
          success: true,
          slug: document.context.slug,
          collection: document.context.collection,
          locale: document.context.locale,
          data: document.read(),
        },
      });
      return;
    }

    if (toolName === 'updateDocument') {
      const input = toolCall.input as { operations?: LlmPatchOperation[] } | undefined;
      try {
        const { changed } = document.applyPatch(input?.operations ?? []);
        this.#chat.addToolOutput({
          tool: 'updateDocument',
          toolCallId,
          state: 'output-available',
          output: { success: true, changed },
        });
      } catch (error) {
        // A rejected patch is the model's problem to fix, not an editor error:
        // report it as tool output so the next turn can correct itself.
        this.#chat.addToolOutput({
          tool: 'updateDocument',
          toolCallId,
          state: 'output-available',
          output: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return;
    }

    this.#chat.addToolOutput({
      tool: 'updateDocument',
      toolCallId,
      state: 'output-error',
      errorText: `Unknown tool: "${toolName}". Available tools are: getDocumentData, updateDocument.`,
    });
  }
}

interface SessionSummaryWire {
  id?: unknown;
  title?: unknown;
  updatedAt?: unknown;
  messageCount?: unknown;
}

function toSessionSummary(wire: SessionSummaryWire): LlmSessionSummary[] {
  if (typeof wire?.id !== 'string') return [];

  return [{
    id: wire.id,
    ...(typeof wire.title === 'string' ? { title: wire.title } : {}),
    ...(typeof wire.updatedAt === 'number'
      ? { updatedAt: new Date(wire.updatedAt).toISOString() }
      : {}),
    ...(typeof wire.messageCount === 'number' ? { messageCount: wire.messageCount } : {}),
  }];
}

/**
 * Build a transport to hand the CMS, either as `DecapCmsProvider`'s `llm` prop
 * or through `CMS.registerLlmTransport`.
 *
 * @example
 * ```ts
 * import { createDullaTransport } from '@laikacms/decap-cms-llm-dulla';
 *
 * CMS.registerLlmTransport(createDullaTransport({ apiBasePath: '/api/ai' }));
 * ```
 */
export function createDullaTransport(options: DullaTransportOptions = {}): LlmTransport {
  const basePath = options.apiBasePath ?? DEFAULT_BASE_PATH;

  return {
    openSession(document: LlmDocumentBridge): LlmSession {
      return new DullaSession(document, options);
    },

    async listSessions(context: LlmDocumentContext): Promise<LlmSessionSummary[]> {
      const authedFetch = createAuthedFetch(options);
      const response = await authedFetch(
        `${basePath}/sessions?documentSlug=${encodeURIComponent(documentKey(context))}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to list conversations (${response.status})`);
      }

      const body = await response.json() as { sessions?: SessionSummaryWire[] };
      return (body.sessions ?? []).flatMap(toSessionSummary);
    },

    async resumeSession(id: string, document: LlmDocumentBridge): Promise<LlmSession> {
      const authedFetch = createAuthedFetch(options);
      const response = await authedFetch(`${basePath}/sessions/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`Failed to open conversation (${response.status})`);
      }

      const body = await response.json() as { session?: { messages?: unknown } };
      return new DullaSession(document, options, {
        sessionId: id,
        messages: fromStoredMessages(body.session?.messages) as DullaUIMessage[],
      });
    },
  };
}
