import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDullaTransport } from '../dullaTransport';

import type { LlmDocumentBridge, LlmSession } from '@laikacms/decap-cms/lib/util';

/**
 * Driven end to end against a fake `/api/ai`: real streaming, real tool
 * round-trip, no model. What is being pinned is the contract on both sides —
 * the wire shape `@laikacms/server/ai` expects, and the `LlmTransport` shape
 * the CMS expects.
 */

/** One server-sent UI message stream, in the shape `decapAi()` answers with. */
function streamResponse(chunks: unknown[], headers: Record<string, string> = {}): Response {
  const body = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('')
    + 'data: [DONE]\n\n';

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', ...headers },
  });
}

function textTurn(text: string, headers: Record<string, string> = {}): Response {
  return streamResponse([
    { type: 'start' },
    { type: 'start-step' },
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: text },
    { type: 'text-end', id: 't' },
    { type: 'finish-step' },
    { type: 'finish' },
  ], headers);
}

function toolTurn(toolName: string, input: unknown): Response {
  return streamResponse([
    { type: 'start' },
    { type: 'start-step' },
    { type: 'tool-input-available', toolCallId: 'call-1', toolName, input },
    { type: 'finish-step' },
    { type: 'finish' },
  ]);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

let applyPatch: ReturnType<typeof vi.fn>;
let read: ReturnType<typeof vi.fn>;

function makeBridge(): LlmDocumentBridge {
  read = vi.fn(() => ({ title: 'Hello' }));
  applyPatch = vi.fn(() => ({ changed: ['title'] }));

  return {
    context: { collection: 'posts', slug: 'hello', locale: 'en' },
    read: read as unknown as LlmDocumentBridge['read'],
    applyPatch: applyPatch as unknown as LlmDocumentBridge['applyPatch'],
    fields: () => [],
  };
}

/**
 * A client-side tool resolves after `sendPrompt` has already returned: the SDK
 * sends the tool output back on its own, so the follow-up turn lands later.
 * Polling for the second request is what "the round trip finished" means here.
 */
async function settled(session: LlmSession): Promise<void> {
  await vi.waitFor(() => {
    if (fetchMock.mock.calls.length < 2 || session.status === 'streaming') {
      throw new Error('still streaming');
    }
  });
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, call: number): Record<string, unknown> {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return JSON.parse(String(init.body));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
});

function makeTransport(overrides: Record<string, unknown> = {}) {
  return createDullaTransport({
    apiBasePath: '/api/ai',
    fetch: fetchMock as unknown as typeof fetch,
    getToken: () => 'token-123',
    ...overrides,
  });
}

describe('createDullaTransport', () => {
  it('posts the prompt to {basePath}/chat with the document context', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi there'));
    const session = makeTransport().openSession(makeBridge());

    await session.sendPrompt('Rewrite the title');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/chat');
    const body = requestBody(fetchMock, 0);
    expect(body.document).toEqual({ slug: 'posts/hello', collection: 'posts', locale: 'en' });
    expect(body.sessionId).toBeNull();
  });

  it('authenticates with the token it is given', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi'));
    const session = makeTransport().openSession(makeBridge());

    await session.sendPrompt('Hello');

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('sends no Authorization header when no getToken is configured', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi'));
    // The point of the seam: credentials are the implementor's business, so
    // Dulla never goes hunting for a token of its own.
    const session = makeTransport({ getToken: undefined }).openSession(makeBridge());

    await session.sendPrompt('Hello');

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('resolves the token per request, so a refreshed one is used', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi'));
    const tokens = ['first', 'second'];
    const session = makeTransport({ getToken: () => tokens.shift() }).openSession(makeBridge());

    await session.sendPrompt('Hello');
    await session.sendPrompt('Again');

    const second = new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers);
    expect(second.get('Authorization')).toBe('Bearer second');
  });

  it('exposes the streamed turn as CMS messages', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi there'));
    const session = makeTransport().openSession(makeBridge());

    await session.sendPrompt('Hello');

    expect(session.messages.map(m => [m.role, m.text])).toEqual([
      ['user', 'Hello'],
      ['assistant', 'Hi there'],
    ]);
    expect(session.status).toBe('idle');
  });

  it('keeps a prompt sent with visible: false out of the transcript', async () => {
    fetchMock.mockResolvedValue(textTurn('Translated'));
    const session = makeTransport().openSession(makeBridge());

    await session.sendPrompt('Translate every field', { visible: false });

    // The model still received it - only the transcript is spared.
    expect(session.messages.map(m => m.role)).toEqual(['assistant']);
    const body = requestBody(fetchMock, 0);
    const messages = body.messages as Array<{ parts: Array<{ text?: string }> }>;
    expect(messages[0].parts[0].text).toBe('Translate every field');
  });

  it('notifies subscribers as the response streams', async () => {
    fetchMock.mockResolvedValue(textTurn('Hi'));
    const session = makeTransport().openSession(makeBridge());
    const listener = vi.fn();
    session.subscribe(listener);

    await session.sendPrompt('Hello');

    expect(listener).toHaveBeenCalled();
  });

  it('executes updateDocument against the bridge and reports back', async () => {
    fetchMock
      .mockResolvedValueOnce(toolTurn('updateDocument', {
        operations: [{ op: 'replace', path: '/title', value: 'New' }],
      }))
      .mockResolvedValueOnce(textTurn('Done'));

    const session = makeTransport().openSession(makeBridge());
    await session.sendPrompt('Retitle it');
    await settled(session);

    expect(applyPatch).toHaveBeenCalledWith([{ op: 'replace', path: '/title', value: 'New' }]);
    // The tool output goes back automatically, so the model can continue.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.messages.at(-1)?.text).toBe('Done');
  });

  it('summarises the changed fields in the transcript', async () => {
    fetchMock
      .mockResolvedValueOnce(toolTurn('updateDocument', { operations: [] }))
      .mockResolvedValueOnce(textTurn('Done'));

    const session = makeTransport().openSession(makeBridge());
    await session.sendPrompt('Retitle it');
    await settled(session);

    const toolCalls = session.messages.flatMap(m => m.toolCalls ?? []);
    expect(toolCalls).toContainEqual(
      expect.objectContaining({ name: 'updateDocument', status: 'done', summary: 'updated title' }),
    );
  });

  it('answers getDocumentData from the bridge', async () => {
    fetchMock
      .mockResolvedValueOnce(toolTurn('getDocumentData', {}))
      .mockResolvedValueOnce(textTurn('The title is Hello'));

    const session = makeTransport().openSession(makeBridge());
    await session.sendPrompt('What is the title?');
    await settled(session);

    expect(read).toHaveBeenCalled();
    const followUp = requestBody(fetchMock, 1);
    expect(JSON.stringify(followUp.messages)).toContain('"title":"Hello"');
  });

  it('reports a rejected patch as tool output rather than failing the turn', async () => {
    applyPatch = vi.fn();
    const bridge = makeBridge();
    (bridge as { applyPatch: unknown }).applyPatch = () => {
      throw new Error('path /nope does not exist');
    };

    fetchMock
      .mockResolvedValueOnce(toolTurn('updateDocument', { operations: [] }))
      .mockResolvedValueOnce(textTurn('Let me try again'));

    const session = makeTransport().openSession(bridge);
    await session.sendPrompt('Break it');
    await settled(session);

    // A model can address a field that does not exist; that is a conversation
    // to continue, not an editor error.
    expect(session.status).toBe('idle');
    expect(JSON.stringify(requestBody(fetchMock, 1))).toContain('path /nope does not exist');
  });

  it('remembers the session id the server assigns and sends it next time', async () => {
    fetchMock
      .mockResolvedValueOnce(textTurn('Hi', { 'X-Session-Id': 'session-42' }))
      .mockResolvedValueOnce(textTurn('Again'));

    const session = makeTransport().openSession(makeBridge());
    await session.sendPrompt('Hello');
    expect(session.id).toBe('session-42');

    await session.sendPrompt('More');
    expect(requestBody(fetchMock, 1).sessionId).toBe('session-42');
  });

  it('rejects when the endpoint fails, and settles into error', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    const session = makeTransport().openSession(makeBridge());

    await expect(session.sendPrompt('Hello')).rejects.toThrow();
    expect(session.status).toBe('error');
  });

  it('recovers from an earlier failure on the next prompt', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(textTurn('Hi'));

    const session = makeTransport().openSession(makeBridge());
    await expect(session.sendPrompt('Hello')).rejects.toThrow();

    await session.sendPrompt('Try again');
    expect(session.status).toBe('idle');
  });
});

describe('listSessions', () => {
  it('asks for this document and maps the wire shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      sessions: [
        { id: 'abc', title: 'Yesterday', updatedAt: 1723000000000, messageCount: 4 },
        { title: 'no id' },
      ],
    }));

    const summaries = await makeTransport().listSessions?.({
      collection: 'posts',
      slug: 'hello',
      locale: 'en',
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/sessions?documentSlug=posts%2Fhello');
    expect(summaries).toEqual([{
      id: 'abc',
      title: 'Yesterday',
      updatedAt: new Date(1723000000000).toISOString(),
      messageCount: 4,
    }]);
  });

  it('throws when the endpoint fails', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 403 }));

    await expect(
      makeTransport().listSessions?.({ collection: 'posts', slug: 'hello' }),
    ).rejects.toThrow(/403/);
  });
});

describe('resumeSession', () => {
  it('restores the stored transcript and keeps writing to that session', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        session: {
          id: 'abc',
          messages: [
            { id: '1', role: 'user', parts: [{ type: 'text', text: 'Earlier' }] },
            { id: '2', role: 'assistant', parts: [{ type: 'text', text: 'Answer' }] },
          ],
        },
      }))
      .mockResolvedValueOnce(textTurn('Continuing'));

    const session = await makeTransport().resumeSession?.('abc', makeBridge());

    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/sessions/abc');
    expect(session?.messages.map(m => m.text)).toEqual(['Earlier', 'Answer']);

    await session?.sendPrompt('And then?');
    expect(requestBody(fetchMock, 1).sessionId).toBe('abc');
  });

  it('throws when the session cannot be read', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

    await expect(makeTransport().resumeSession?.('abc', makeBridge())).rejects.toThrow(/404/);
  });
});
