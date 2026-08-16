import { type UIMessage, useChat } from '@ai-sdk/react';
import styled from '@emotion/styled';
import { changeDraftField } from '@laikacms/decap-cms/core';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { applyPatch, type Operation } from 'fast-json-patch';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';

import en from './i18n/en';
import { getI18nInfo, selectFields } from './utils';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@laikacms/decap-cms/lib/util';
import type { AiChatWidgetOptions, DocumentContext, SessionSummary } from './types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid #dfdfe3;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  margin-top: -26px;
  position: relative;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #dfdfe3;
`;

const HeaderTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SessionSelect = styled.select`
  padding: 6px 12px;
  border: 1px solid #dfdfe3;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;

  &:hover {
    border-color: #3a69c7;
  }
`;

const NewSessionButton = styled.button`
  padding: 6px 12px;
  background: #3a69c7;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #2d5299;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MessageBubble = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  max-width: 85%;
  font-size: 14px;
  line-height: 1.5;

  &.user {
    background: #3a69c7;
    color: #fff;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  &.assistant {
    background: #f1f3f4;
    color: #333;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 13px;
  }

  code {
    background: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 13px;
  }

  pre code {
    background: none;
    padding: 0;
  }
`;

const ToolCall = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
  font-size: 12px;

  .tool-name {
    font-weight: 600;
    color: #856404;
  }

  .tool-result {
    margin-top: 4px;
    padding: 4px 8px;
    background: #fff;
    border-radius: 2px;
    font-family: monospace;
    font-size: 11px;
    max-height: 100px;
    overflow-y: auto;
  }
`;

const InputContainer = styled.form`
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #dfdfe3;
  background: #f8f9fa;
`;

const Input = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #dfdfe3;
  border-radius: 6px;
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 120px;

  &:focus {
    outline: none;
    border-color: #3a69c7;
    box-shadow: 0 0 0 2px rgba(58, 105, 199, 0.2);
  }

  &:disabled {
    background: #e9ecef;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  padding: 10px 20px;
  background: #3a69c7;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #2d5299;
  }

  &:disabled {
    background: #a0a0a0;
    cursor: not-allowed;
  }
`;

const Loading = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #666;
  font-size: 13px;

  .dot {
    width: 6px;
    height: 6px;
    background: #3a69c7;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-of-type(1) {
      animation-delay: -0.32s;
    }
    &:nth-of-type(2) {
      animation-delay: -0.16s;
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
  text-align: center;

  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`;

/** Field options the aichat widget reads from its own field definition. */
export type AiChatFieldOptions = {
  placeholder?: string,
  welcomeMessage?: string,
  maxHeight?: string,
};

export interface AiChatControlProps {
  field: CmsEntryField & AiChatFieldOptions;
  collection: CmsCollectionState;
  /** Deprecated upstream (can contain stale data); fresh data comes from `getEntry`. */
  entry?: CmsEntry;
  getEntry?: () => CmsEntry | undefined;
  metadata?: Record<string, unknown>;
  locale?: string | undefined;
  widget: AiChatWidgetOptions;
}

/**
 * Get the data for a specific locale. For the default locale the data lives at
 * `entry.data`; for other locales at `entry.i18n[locale].data`.
 */
function getLocaleData(
  entry: CmsEntry | undefined,
  locale: string | undefined,
  defaultLocale: string | undefined,
): Record<string, unknown> {
  const defaultData = (entry?.data as Record<string, unknown>) ?? {};
  if (!locale || !defaultLocale || locale === defaultLocale) {
    return defaultData;
  }

  const localeEntry = (entry?.i18n as Record<string, { data?: Record<string, unknown> }> | undefined)?.[locale];
  if (localeEntry?.data) {
    return localeEntry.data;
  }

  return defaultData;
}

/**
 * Get current document context from Decap CMS
 */
function getDocumentContext(
  entry: CmsEntry | undefined,
  locale: string | undefined,
  defaultLocale: string | undefined,
): DocumentContext {
  const data = getLocaleData(entry, locale, defaultLocale);
  const slug = entry?.slug || 'untitled';
  const collection = entry?.collection || undefined;

  return {
    data,
    slug,
    collection,
    locale,
  };
}

interface ToolInvocationPartProps {
  toolCallId: string;
  toolName: string;
  state: string;
  output?: unknown;
}

function ToolInvocationPart({ toolName, state, output }: ToolInvocationPartProps) {
  return (
    <ToolCall>
      <div className="tool-name">
        🔧 {toolName}
      </div>
      {state === 'output-available' && output != null
        ? (
          <div className="tool-result">
            {JSON.stringify(output, null, 2)}
          </div>
        )
        : state === 'output-error'
        ? (
          <div className="tool-result" style={{ color: '#dc3545' }}>
            Error: {JSON.stringify(output, null, 2)}
          </div>
        )
        : null}
    </ToolCall>
  );
}

type MessagePartData = {
  type?: string,
  text?: string,
  toolCallId?: string,
  toolName?: string,
  state?: string,
  output?: unknown,
  toolInvocation?: {
    toolCallId?: string,
    toolName?: string,
    state?: string,
    output?: unknown,
  },
};

/**
 * Check if a part type is a tool invocation (type starts with 'tool-')
 */
function isToolInvocationPart(part: MessagePartData): boolean {
  return Boolean(part.type?.startsWith('tool-')) && part.type !== 'text';
}

/**
 * Extract tool name from part type (e.g., 'tool-updateDocument' -> 'updateDocument')
 */
function getToolNameFromPart(part: MessagePartData): string {
  if (part.type?.startsWith('tool-')) {
    return part.type.slice(5); // Remove 'tool-' prefix
  }
  return part.toolName || 'Unknown tool';
}

/**
 * Render a single message part based on its type
 */
function MessagePart({ part, index }: { part: MessagePartData, index: number }) {
  if (part.type === 'text') {
    return <span>{part.text}</span>;
  }
  // Tool invocations: v3 format has tool data directly on the part; the legacy
  // format nests it in part.toolInvocation.
  if (isToolInvocationPart(part)) {
    const toolCallId = part.toolCallId || part.toolInvocation?.toolCallId || '';
    const toolName = getToolNameFromPart(part) || part.toolInvocation?.toolName || 'Unknown tool';
    const state = part.state || part.toolInvocation?.state || '';
    const output = part.output ?? part.toolInvocation?.output;

    return (
      <ToolInvocationPart
        key={toolCallId || index}
        toolCallId={toolCallId}
        toolName={toolName}
        state={state}
        output={output}
      />
    );
  }
  return null;
}

type StoreEntitiesState = {
  entries?: { entities?: Record<string, CmsEntry> },
  editorialWorkflow?: { entities?: Record<string, CmsEntry> },
};

export function AiChatControl(props: AiChatControlProps) {
  const { field, locale, entry, widget, metadata, collection } = props;

  const dispatch = useDispatch();
  const reduxStore = useStore();

  // Use widget messages if provided, otherwise the English defaults
  const t = widget.messages ?? en;

  const i18nInfo = useMemo(() => getI18nInfo(collection), [collection]);
  const defaultLocale = i18nInfo?.defaultLocale;

  const placeholder = field.placeholder || t.defaultPlaceholder;
  const welcomeMessage = field.welcomeMessage || t.defaultWelcomeMessage;
  const maxHeight = field.maxHeight || '500px';

  // The api option should be the base path (e.g., '/api/ai'). useChat sends to
  // `${api}` directly, so /chat is appended here.
  const apiBasePath = widget.aiSdk?.api || '/api/ai';
  const chatEndpoint = `${apiBasePath}/chat`;
  const sessionsEndpoint = apiBasePath;

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Prefer the live draft entry over the deprecated (possibly stale) entry prop.
  const getEntryProp = props.getEntry;
  const getLiveEntry = useCallback(() => getEntryProp?.() ?? entry, [getEntryProp, entry]);

  const documentContext = useMemo(() => getDocumentContext(getLiveEntry(), locale, defaultLocale), [
    getLiveEntry,
    locale,
    defaultLocale,
  ]);

  const aiFetch = widget.aiSdk?.fetch || fetch;

  const widgetBody = widget.aiSdk?.body;

  // Transport with dynamic body that includes sessionId and document context
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: chatEndpoint,
      fetch: aiFetch,
      body: () => ({
        ...widgetBody,
        sessionId: currentSessionId,
        document: documentContext,
      }),
    });
  }, [chatEndpoint, aiFetch, widgetBody, currentSessionId, documentContext]);

  const chatHelpersRef = useRef<ReturnType<typeof useChat> | null>(null);

  const chatHelpers = useChat({
    transport,
    onToolCall: ({ toolCall }: { toolCall: any }) => {
      const liveEntry = getLiveEntry();
      const currentData = getLocaleData(liveEntry, locale, defaultLocale);
      const slug = liveEntry?.slug || 'untitled';
      const collectionName = liveEntry?.collection || undefined;

      const toolName: string = toolCall.toolName
        || (toolCall.type ? String(toolCall.type).replace('tool-', '') : 'unknown');
      const toolCallId = toolCall.toolCallId;
      const args = toolCall.input || toolCall.args || {};

      const addOutput = (output: unknown) => {
        chatHelpersRef.current?.addToolOutput({
          tool: toolName as never,
          toolCallId,
          state: 'output-available',
          output,
        });
      };

      switch (toolName) {
        case 'getDocumentData': {
          addOutput({
            success: true,
            slug,
            collection: collectionName,
            locale,
            data: currentData,
          });
          break;
        }

        case 'updateDocument': {
          const operations = (args as { operations?: Operation[] })?.operations || [];

          try {
            // Apply JSON Patch operations to get the new document
            const result = applyPatch(currentData, operations, true, false);

            if (result.newDocument) {
              const fields = selectFields(collection, slug);
              const state = reduxStore.getState() as StoreEntitiesState;
              const entityKey = `${collection.name}.${slug}`;
              // Mirrors useEditor's handleChangeDraftField: the reducer diffs
              // the draft against these originals to compute hasChanged.
              const entries = [
                state.editorialWorkflow?.entities?.[entityKey],
                state.entries?.entities?.[entityKey],
              ].filter(Boolean) as CmsEntry[];
              const i18n = i18nInfo && locale
                ? {
                  currentLocale: locale,
                  defaultLocale: i18nInfo.defaultLocale,
                  locales: i18nInfo.locales,
                }
                : undefined;

              Object.keys(result.newDocument).forEach(key => {
                const value = (result.newDocument as Record<string, unknown>)[key];
                const hasChanges = operations.some(op => op.path.startsWith(`/${key}`));
                if (!hasChanges) {
                  return;
                }
                const thisField = fields?.find(f => f.name === key);
                if (!thisField) {
                  console.warn(`Field "${key}" not found in collection schema, skipping update`);
                  return;
                }
                dispatch(changeDraftField({
                  field: thisField,
                  value,
                  metadata: metadata ?? {},
                  entries,
                  i18n,
                }));
              });

              addOutput({ success: true });
            } else {
              addOutput({
                success: false,
                error: t.failedToApplyPatch,
              });
            }
          } catch (err) {
            addOutput({
              success: false,
              error: err instanceof Error ? err.message : t.unknownErrorApplyingPatch,
            });
          }
          break;
        }

        default:
          // Unknown tool: provide error output so the AI knows the tool doesn't exist
          console.warn(`Unknown tool: ${toolName}`);
          chatHelpersRef.current?.addToolOutput({
            tool: toolName as never,
            toolCallId,
            state: 'output-error',
            errorText: `Unknown tool: "${toolName}". Available tools are: getDocumentData, updateDocument.`,
          });
          break;
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      widget.aiSdk?.onError?.(err);
    },
    onFinish: (event: unknown) => {
      widget.aiSdk?.onFinish?.(event);
    },
    // Automatically continue after tool calls are completed
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  chatHelpersRef.current = chatHelpers;

  const { messages, sendMessage, status, setMessages } = chatHelpers;

  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch sessions for this document
  const fetchSessions = useCallback(async () => {
    if (!documentContext.slug) return;

    setIsLoadingSessions(true);
    try {
      const response = await aiFetch(
        `${sessionsEndpoint}/sessions?documentSlug=${encodeURIComponent(documentContext.slug)}`,
      );

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [documentContext.slug, aiFetch, sessionsEndpoint]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load session messages when session changes
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await aiFetch(`${sessionsEndpoint}/sessions/${sessionId}`);

      if (response.ok) {
        const data = await response.json();
        const session = data.session;

        // Messages are stored in UIMessage format with a parts array
        const chatMessages: UIMessage[] = session.messages.map((m: {
          id: string,
          role: string,
          parts?: unknown[],
        }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: m.parts || [],
        }));

        setMessages(chatMessages);
        setCurrentSessionId(sessionId);
      } else {
        console.error('Failed to load session, status:', response.status);
        setError(t.failedToLoadSession);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError(t.failedToLoadSession);
    }
  }, [setMessages, aiFetch, sessionsEndpoint, t.failedToLoadSession]);

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
  }, [setMessages]);

  const handleSessionSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = e.target.value;
    if (sessionId === 'new') {
      handleNewSession();
    } else if (sessionId) {
      loadSession(sessionId);
    }
  }, [handleNewSession, loadSession]);

  const handleFormSubmit = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input || !input.trim() || isLoading) return;

    try {
      await sendMessage({ text: input });
      setInput('');
    } catch {
      setError(t.failedToSendMessage);
    }
  }, [input, isLoading, sendMessage, t.failedToSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  }, [handleFormSubmit]);

  return (
    <Container style={{ maxHeight }}>
      <Header>
        <HeaderTitle>
          <span>🤖</span>
          <span>{t.aiAssistant}</span>
        </HeaderTitle>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {sessions.length > 0 && (
            <SessionSelect
              value={currentSessionId || 'new'}
              onChange={handleSessionSelect}
            >
              <option value="new">{t.newConversation}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title || `${t.session} ${s.id.slice(0, 8)}`}
                </option>
              ))}
            </SessionSelect>
          )}
          {currentSessionId && (
            <NewSessionButton onClick={handleNewSession}>
              {t.newButton}
            </NewSessionButton>
          )}
        </div>
      </Header>

      <MessagesContainer>
        {messages.length === 0
          ? (
            <EmptyState>
              <div className="icon">💬</div>
              <h3>{t.startConversation}</h3>
              <p>{welcomeMessage}</p>
            </EmptyState>
          )
          : (
            messages.map(message => (
              <MessageBubble key={message.id} className={message.role}>
                {/* Render parts in order: text and tool calls interleaved */}
                {message.parts.map((part, index) => (
                  <MessagePart key={index} part={part as MessagePartData} index={index} />
                ))}
              </MessageBubble>
            ))
          )}

        {isLoading && (
          <Loading>
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
            <span>{t.aiThinking}</span>
          </Loading>
        )}

        {error && (
          <div style={{ color: '#dc3545', padding: '8px', fontSize: '13px' }}>
            {t.error}: {error}
          </div>
        )}
      </MessagesContainer>

      <InputContainer onSubmit={handleFormSubmit}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
        />
        <SendButton
          type="submit"
          disabled={isLoading || !input || !input.trim()}
        >
          {t.send}
        </SendButton>
      </InputContainer>
    </Container>
  );
}

export default AiChatControl;
