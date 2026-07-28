const mockSendMessage = vi.fn().mockResolvedValue(undefined);
const mockSetMessages = vi.fn();
const mockAddToolOutput = vi.fn();

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(),
}));

vi.mock('ai', () => ({
  DefaultChatTransport: class DefaultChatTransport {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  },
  lastAssistantMessageIsCompleteWithToolCalls: vi.fn(),
}));

import { useChat } from '@ai-sdk/react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiTranslate } from '@/core/components/Editor/EditorControlPane/useAiTranslate';

const useChatMock = useChat as unknown as ReturnType<typeof vi.fn>;

let capturedOnToolCall: ((args: { toolCall: unknown }) => void) | undefined;
let capturedOnFinish: (() => void) | undefined;
let capturedOnError: ((err: Error) => void) | undefined;

function configureUseChat() {
  useChatMock.mockImplementation((options: {
    onToolCall?: (args: { toolCall: unknown }) => void;
    onFinish?: () => void;
    onError?: (err: Error) => void;
  }) => {
    capturedOnToolCall = options.onToolCall;
    capturedOnFinish = options.onFinish;
    capturedOnError = options.onError;
    return {
      messages: [],
      sendMessage: mockSendMessage,
      status: 'ready',
      setMessages: mockSetMessages,
      addToolOutput: mockAddToolOutput,
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendMessage.mockResolvedValue(undefined);
  capturedOnToolCall = undefined;
  capturedOnFinish = undefined;
  capturedOnError = undefined;
  configureUseChat();
});

describe('useAiTranslate', () => {
  it('sends a translate instruction message built from the given fields', async () => {
    const { result } = renderHook(() => useAiTranslate());

    await act(async () => {
      await result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        collection: 'posts',
        fields: [{ name: 'title', value: 'Hello' }],
        onFieldTranslated: vi.fn(),
      });
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const sentText = mockSendMessage.mock.calls[0][0].text as string;
    expect(sentText).toContain('from locale "en" to locale "fr"');
    expect(sentText).toContain('"title"');
  });

  it('does nothing when there are no translatable fields', async () => {
    const { result } = renderHook(() => useAiTranslate());

    await act(async () => {
      await result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        fields: [],
        onFieldTranslated: vi.fn(),
      });
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('applies translated fields from updateDocument tool calls via onFieldTranslated', async () => {
    const onFieldTranslated = vi.fn();
    const { result } = renderHook(() => useAiTranslate());

    await act(async () => {
      await result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        collection: 'posts',
        fields: [{ name: 'title', value: 'Hello' }],
        onFieldTranslated,
      });
    });

    act(() => {
      capturedOnToolCall?.({
        toolCall: {
          toolName: 'updateDocument',
          toolCallId: 'call-1',
          input: { operations: [{ op: 'replace', path: '/title', value: 'Bonjour' }] },
        },
      });
    });

    expect(onFieldTranslated).toHaveBeenCalledWith('title', 'Bonjour');
    expect(mockAddToolOutput).toHaveBeenCalledWith(
      expect.objectContaining({ toolCallId: 'call-1', output: expect.objectContaining({ success: true }) }),
    );
  });

  it('answers getDocumentData tool calls with the source-locale field values', async () => {
    const { result } = renderHook(() => useAiTranslate());

    await act(async () => {
      await result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        collection: 'posts',
        fields: [{ name: 'title', value: 'Hello' }],
        onFieldTranslated: vi.fn(),
      });
    });

    act(() => {
      capturedOnToolCall?.({
        toolCall: { toolName: 'getDocumentData', toolCallId: 'call-2', input: {} },
      });
    });

    expect(mockAddToolOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCallId: 'call-2',
        output: expect.objectContaining({ locale: 'en', data: { title: 'Hello' } }),
      }),
    );
  });

  it('sets isTranslating true while the chat is in flight and false on finish', async () => {
    let resolveSend: () => void = () => {};
    mockSendMessage.mockImplementation(() => new Promise<void>(resolve => (resolveSend = resolve)));

    const { result } = renderHook(() => useAiTranslate());

    let translatePromise!: Promise<void>;
    act(() => {
      translatePromise = result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        fields: [{ name: 'title', value: 'Hello' }],
        onFieldTranslated: vi.fn(),
      });
    });

    expect(result.current.isTranslating).toBe(true);

    act(() => {
      capturedOnFinish?.();
      resolveSend();
    });
    await act(async () => {
      await translatePromise;
    });

    expect(result.current.isTranslating).toBe(false);
  });

  it('surfaces chat errors via onError', async () => {
    const { result } = renderHook(() => useAiTranslate());

    await act(async () => {
      await result.current.translate({
        sourceLocale: 'en',
        targetLocale: 'fr',
        slug: 'my-post',
        fields: [{ name: 'title', value: 'Hello' }],
        onFieldTranslated: vi.fn(),
      });
    });

    act(() => {
      capturedOnError?.(new Error('boom'));
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.isTranslating).toBe(false);
  });
});
