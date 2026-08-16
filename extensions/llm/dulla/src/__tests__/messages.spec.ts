import { describe, expect, it } from 'vitest';

import { fromStoredMessages, HIDDEN_METADATA_KEY, toLlmMessages } from '../messages';

import type { UIMessage } from 'ai';

/**
 * The CMS never sees a `UIMessage`. These pin the projection that keeps it that
 * way — including the two cases the panel would render wrong: hidden prompts
 * and tool-only assistant turns.
 */

function message(overrides: Partial<UIMessage> & { id: string, role: UIMessage['role'] }): UIMessage {
  return { parts: [], ...overrides } as UIMessage;
}

describe('toLlmMessages', () => {
  it('joins text parts into one string', () => {
    const result = toLlmMessages([
      message({
        id: '1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'there' },
        ],
      }),
    ]);

    expect(result).toEqual([{ id: '1', role: 'assistant', text: 'Hello there' }]);
  });

  it('drops prompts sent with visible: false', () => {
    const result = toLlmMessages([
      message({
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'Translate everything' }],
        metadata: { [HIDDEN_METADATA_KEY]: true },
      }),
      message({ id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Done' }] }),
    ]);

    // The translate action drives the shared session without cluttering it.
    expect(result.map(m => m.id)).toEqual(['2']);
  });

  it('reports tool calls with the fields the CMS changed', () => {
    const result = toLlmMessages([
      message({
        id: '1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Updated it.' },
          {
            type: 'tool-updateDocument',
            toolCallId: 't1',
            state: 'output-available',
            input: {},
            output: { success: true, changed: ['title', 'body'] },
          },
        ],
      }),
    ]);

    expect(result[0].toolCalls).toEqual([
      { id: 't1', name: 'updateDocument', status: 'done', summary: 'updated title, body' },
    ]);
  });

  it('surfaces a tool error as the summary', () => {
    const result = toLlmMessages([
      message({
        id: '1',
        role: 'assistant',
        parts: [{
          type: 'tool-updateDocument',
          toolCallId: 't1',
          state: 'output-error',
          input: {},
          errorText: 'patch rejected',
        }],
      }),
    ]);

    expect(result[0].toolCalls).toEqual([
      { id: 't1', name: 'updateDocument', status: 'error', summary: 'patch rejected' },
    ]);
  });

  it('keeps a tool-only turn, which has no text at all', () => {
    const result = toLlmMessages([
      message({
        id: '1',
        role: 'assistant',
        parts: [{
          type: 'tool-getDocumentData',
          toolCallId: 't1',
          state: 'input-available',
          input: {},
        }],
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('');
    expect(result[0].toolCalls?.[0].status).toBe('pending');
  });

  it('drops a message that would render as nothing', () => {
    const result = toLlmMessages([
      message({ id: '1', role: 'assistant', parts: [{ type: 'step-start' }] }),
    ]);

    expect(result).toEqual([]);
  });
});

describe('fromStoredMessages', () => {
  it('restores persisted messages', () => {
    const result = fromStoredMessages([
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
    ]);

    expect(result).toEqual([{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }]);
  });

  it('skips malformed entries rather than throwing', () => {
    // A stored session is data from someone else's database; a bad row should
    // cost one message, not the whole conversation.
    const result = fromStoredMessages([null, { role: 'user' }, { id: '2', role: 'assistant' }]);

    expect(result).toEqual([{ id: '2', role: 'assistant', parts: [] }]);
  });

  it('returns nothing for a non-array', () => {
    expect(fromStoredMessages(undefined)).toEqual([]);
  });
});
