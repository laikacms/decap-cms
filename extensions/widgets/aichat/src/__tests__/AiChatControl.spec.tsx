const mockDispatch = vi.fn();

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

// Partial mock: the control imports `changeDraftField` from
// `@laikacms/decap-cms/core`, whose barrel pulls in other react-redux
// consumers (useRedux, DecapCmsProvider), so the real exports must stay.
vi.mock('react-redux', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useDispatch: () => mockDispatch,
  useStore: () => ({ getState: () => ({}) }),
}));

import { useChat } from '@ai-sdk/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiChatControl } from '../AiChatControl';

import type { CmsCollectionState, CmsEntry, CmsEntryField } from '@laikacms/decap-cms/lib/util';
import type { AiChatWidgetOptions } from '../types';

const useChatMock = useChat as unknown as ReturnType<typeof vi.fn>;

const mockSendMessage = vi.fn();
const mockSetMessages = vi.fn();
const mockAddToolOutput = vi.fn();

let capturedUseChatOptions:
  | { onError?: (err: Error) => void, onFinish?: (event: unknown) => void }
  | undefined;

function configureUseChat(overrides: {
  messages?: unknown[],
  status?: string,
} = {}) {
  useChatMock.mockImplementation(
    (options: { onError?: (err: Error) => void, onFinish?: (event: unknown) => void }) => {
      capturedUseChatOptions = options;
      return {
        messages: overrides.messages ?? [],
        sendMessage: mockSendMessage,
        status: overrides.status ?? 'ready',
        setMessages: mockSetMessages,
        addToolOutput: mockAddToolOutput,
      };
    },
  );
}

const field = {
  name: 'chat',
  widget: 'ai-chat',
  placeholder: 'Ask the AI assistant...',
  welcomeMessage: 'How can I help with this document?',
} as unknown as CmsEntryField & { placeholder?: string, welcomeMessage?: string, maxHeight?: string };

const collection = {
  name: 'posts',
  type: 'folder_based_collection',
  fields: [],
} as unknown as CmsCollectionState;

const entry = {
  slug: 'my-post',
  collection: 'posts',
  data: { title: 'Hello world' },
} as unknown as CmsEntry;

function buildWidget(overrides: Partial<AiChatWidgetOptions['aiSdk']> = {}): AiChatWidgetOptions {
  return {
    aiSdk: {
      // No sessions/tool endpoints are exercised in these tests, so a fetch
      // stub that never resolves ok keeps `fetchSessions` a silent no-op.
      fetch: vi.fn().mockResolvedValue({ ok: false }),
      api: '/api/ai',
      ...overrides,
    },
  };
}

function renderControl(props: Partial<React.ComponentProps<typeof AiChatControl>> = {}) {
  return render(
    <AiChatControl
      field={field}
      collection={collection}
      entry={entry}
      widget={buildWidget()}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedUseChatOptions = undefined;
  configureUseChat();
});

describe('AiChatControl render', () => {
  it('renders the welcome message and placeholder when there are no messages', () => {
    renderControl();

    expect(screen.getByText('How can I help with this document?')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask the AI assistant...')).toBeInTheDocument();
  });

  it('renders message bubbles for existing conversation history', () => {
    configureUseChat({
      messages: [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Hi there' }] },
        { id: 'm2', role: 'assistant', parts: [{ type: 'text', text: 'Hello! How can I help?' }] },
      ],
    });

    renderControl();

    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
  });
});

describe('AiChatControl input value change / onChange wiring', () => {
  it('updates the textarea value as the user types', async () => {
    const user = userEvent.setup();
    renderControl();

    const textarea = screen.getByPlaceholderText('Ask the AI assistant...');
    await user.type(textarea, 'What is this page about?');

    expect(textarea).toHaveValue('What is this page about?');
  });

  it('disables the send button until there is non-whitespace input', async () => {
    const user = userEvent.setup();
    renderControl();

    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText('Ask the AI assistant...');
    await user.type(textarea, '   ');
    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Real question');
    expect(sendButton).toBeEnabled();
  });

  it('sends the message and clears the input on submit', async () => {
    const user = userEvent.setup();
    mockSendMessage.mockResolvedValue(undefined);
    renderControl();

    const textarea = screen.getByPlaceholderText('Ask the AI assistant...');
    await user.type(textarea, 'What is this page about?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'What is this page about?' });
    expect(textarea).toHaveValue('');
  });

  it('submits on Enter without a shift key, without inserting a newline', async () => {
    const user = userEvent.setup();
    mockSendMessage.mockResolvedValue(undefined);
    renderControl();

    const textarea = screen.getByPlaceholderText('Ask the AI assistant...');
    await user.type(textarea, 'Quick question{Enter}');

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Quick question' });
  });
});

describe('AiChatControl loading state', () => {
  it('shows the thinking indicator and disables input while a response streams', () => {
    configureUseChat({ status: 'streaming' });
    renderControl();

    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask the AI assistant...')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

describe('AiChatControl error state', () => {
  it('renders the transport error message when the chat reports onError', () => {
    renderControl();

    act(() => {
      capturedUseChatOptions?.onError?.(new Error('network down'));
    });

    expect(screen.getByText(/network down/)).toBeInTheDocument();
  });

  it('forwards the error to the widget-level aiSdk.onError callback', () => {
    const onError = vi.fn();
    renderControl({ widget: buildWidget({ onError }) });

    const error = new Error('network down');
    act(() => {
      capturedUseChatOptions?.onError?.(error);
    });

    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe('AiChatControl finish state', () => {
  it('forwards the finish event to the widget-level aiSdk.onFinish callback', () => {
    const onFinish = vi.fn();
    renderControl({ widget: buildWidget({ onFinish }) });

    const event = { message: { id: 'm1', role: 'assistant', parts: [] } };
    act(() => {
      capturedUseChatOptions?.onFinish?.(event);
    });

    expect(onFinish).toHaveBeenCalledWith(event);
  });
});
