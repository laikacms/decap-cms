import styled from '@emotion/styled';
import React, { useCallback, useEffect, useState } from 'react';

import { useTranslate } from '@/core/i18n';
import { useLlmTransport } from '@/core/lib/llm';
import { useLlmSession, useLlmSessionUpdates } from '@/core/lib/llmSession';
import { colors, lengths } from '@/ui/default/index';

import type { EditorPanelRenderProps } from '@/core/lib/slots';
import type { LlmMessage, LlmSessionSummary } from '@/lib/util/index';

/**
 * The CMS's chat UI. It renders an `LlmSession` and nothing else: no model, no
 * endpoint, no streaming library, no knowledge of how a reply is produced. The
 * transport (`LlmTransport`) owns all of that, and executes any document edits
 * the model asks for through the `LlmDocumentBridge`, which is why an AI edit
 * shows up in the form exactly like a keystroke.
 *
 * This replaces the `ai-chat` *widget*, which only existed because a widget
 * was the sole injection point in v3 — a conversation about an entry was never
 * a field of that entry.
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const SessionBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid ${colors.textFieldBorder};
`;

const SessionSelect = styled.select`
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.background};
  color: ${colors.text};
  font-size: 13px;
`;

const NewSessionButton = styled.button`
  padding: 4px 8px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.background};
  color: ${colors.controlLabel};
  font-size: 13px;
  cursor: pointer;
`;

const Messages = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Bubble = styled.div<{ $role: LlmMessage['role'] }>`
  max-width: 90%;
  padding: 8px 10px;
  border-radius: ${lengths.borderRadius};
  font-size: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  align-self: ${(props: { $role: LlmMessage['role'] }) => props.$role === 'user' ? 'flex-end' : 'flex-start'};
  background-color: ${(props: { $role: LlmMessage['role'] }) =>
  props.$role === 'user' ? colors.active : colors.textFieldBorder};
  color: ${(props: { $role: LlmMessage['role'] }) => props.$role === 'user' ? colors.textLight : colors.text};
`;

const ToolCallLine = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: ${colors.controlLabel};
`;

const EmptyState = styled.div`
  margin: auto;
  padding: 16px;
  text-align: center;
  color: ${colors.controlLabel};
  font-size: 14px;
`;

const ErrorLine = styled.div`
  padding: 8px 12px;
  color: ${colors.errorText};
  font-size: 13px;
`;

const Composer = styled.form`
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid ${colors.textFieldBorder};
`;

const Input = styled.textarea`
  flex: 1;
  resize: none;
  padding: 8px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.background};
  color: ${colors.text};
  font-family: inherit;
  font-size: 14px;
`;

const SendButton = styled.button`
  align-self: flex-end;
  padding: 8px 14px;
  border: none;
  border-radius: ${lengths.borderRadius};
  background-color: ${colors.active};
  color: ${colors.textLight};
  font-size: 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export type AiChatPanelProps = EditorPanelRenderProps;

function AiChatPanel({ collection, entry, locale }: AiChatPanelProps) {
  const t = useTranslate();
  const transport = useLlmTransport();
  const sessionContext = useLlmSession();
  const session = sessionContext?.session;
  useLlmSessionUpdates(session);

  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<LlmSessionSummary[]>([]);
  const [sendError, setSendError] = useState<string | undefined>(undefined);

  const listSessions = transport?.listSessions;
  const collectionName = collection.name;
  const slug = entry?.slug ?? '';
  useEffect(() => {
    if (!listSessions) return;

    let cancelled = false;
    // A transport without session persistence simply reports none, and the
    // history bar never appears.
    Promise.resolve(
      listSessions({ collection: collectionName, slug, ...(locale ? { locale } : {}) }),
    )
      .then(found => {
        if (!cancelled) setSessions(found);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [listSessions, collectionName, slug, locale]);

  const handleSubmit = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || session?.status === 'streaming') return;

    const active = sessionContext?.ensureSession();
    if (!active) return;

    setSendError(undefined);
    setInput('');
    try {
      await active.sendPrompt(text);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : t('editor.aiChat.sendFailed'));
    }
  }, [input, session?.status, sessionContext, t]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSubmit(event);
    }
  }

  if (!transport) return null;

  const messages = session?.messages ?? [];
  const isStreaming = session?.status === 'streaming';
  const error = sendError ?? session?.error?.message;

  return (
    <Container>
      {sessions.length > 0 && (
        <SessionBar>
          <SessionSelect
            aria-label={t('editor.aiChat.conversations')}
            value={session?.id ?? 'new'}
            onChange={event => {
              const { value } = event.target;
              if (value === 'new') {
                sessionContext?.resetSession();
              } else {
                sessionContext?.resumeSession(value);
              }
            }}
          >
            <option value="new">{t('editor.aiChat.newConversation')}</option>
            {sessions.map(summary => (
              <option key={summary.id} value={summary.id}>
                {summary.title || `${t('editor.aiChat.conversation')} ${summary.id.slice(0, 8)}`}
              </option>
            ))}
          </SessionSelect>
          <NewSessionButton type="button" onClick={() => sessionContext?.resetSession()}>
            {t('editor.aiChat.newButton')}
          </NewSessionButton>
        </SessionBar>
      )}

      <Messages>
        {messages.length === 0
          ? <EmptyState>{t('editor.aiChat.welcome')}</EmptyState>
          : messages.map(message => (
            <Bubble key={message.id} $role={message.role}>
              {message.text}
              {message.toolCalls?.map(call => (
                <ToolCallLine key={call.id}>
                  {call.summary ?? t(`editor.aiChat.toolCall.${call.status}`, { name: call.name })}
                </ToolCallLine>
              ))}
            </Bubble>
          ))}
        {isStreaming && <EmptyState>{t('editor.aiChat.thinking')}</EmptyState>}
      </Messages>

      {error && <ErrorLine role="alert">{error}</ErrorLine>}

      <Composer onSubmit={handleSubmit}>
        <Input
          rows={2}
          value={input}
          disabled={isStreaming}
          placeholder={t('editor.aiChat.placeholder')}
          aria-label={t('editor.aiChat.placeholder')}
          onChange={event => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <SendButton type="submit" disabled={isStreaming || input.trim().length === 0}>
          {t('editor.aiChat.send')}
        </SendButton>
      </Composer>
    </Container>
  );
}

export default AiChatPanel;
