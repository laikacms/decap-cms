import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AiChatPanel from '@/core/components/Editor/AiChatPanel/AiChatPanel';
import { I18n } from '@/core/i18n';
import { LlmTransportProvider } from '@/core/lib/llm';
import { LlmSessionProvider } from '@/core/lib/llmSession';
import en from '@/locales/en/index';

import type {
  CmsCollectionState,
  CmsEntry,
  LlmDocumentBridge,
  LlmMessage,
  LlmSession,
  LlmTransport,
} from '@/lib/util/index';
import type { Store } from 'redux';

/**
 * The panel is driven end to end by a fake `LlmTransport`: no network, no SDK,
 * no model. That is the whole point of the seam — everything the CMS ships can
 * be exercised without an AI provider existing.
 */

const collection = {
  name: 'posts',
  type: 'folder_based_collection',
  fields: [{ name: 'title', widget: 'string' }],
} as unknown as CmsCollectionState;

const entry = {
  slug: 'hello',
  collection: 'posts',
  data: { title: 'Hello' },
} as unknown as CmsEntry;

/** A session a test drives by hand, with the subscribe/notify contract. */
function createFakeSession(overrides: Partial<LlmSession> = {}) {
  const listeners = new Set<() => void>();
  const session = {
    messages: [] as LlmMessage[],
    status: 'idle' as LlmSession['status'],
    sendPrompt: vi.fn(async () => {}),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: vi.fn(),
    ...overrides,
  };
  return {
    session: session as unknown as LlmSession,
    notify: () => listeners.forEach(listener => listener()),
  };
}

let dispatched: unknown[] = [];

function makeStore(): Store {
  return {
    getState: () => ({ entries: { entities: {} }, editorialWorkflow: { entities: {} } }),
    dispatch: ((action: unknown) => {
      dispatched.push(action);
      return action;
    }) as Store['dispatch'],
    subscribe: () => () => {},
    replaceReducer: () => {},
  } as unknown as Store;
}

function renderPanel(transport: LlmTransport) {
  return render(
    <Provider store={makeStore()}>
      <I18n locale="en" messages={en}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry}>
            <AiChatPanel collection={collection} entry={entry} onClose={() => {}} />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </I18n>
    </Provider>,
  );
}

beforeEach(() => {
  dispatched = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AiChatPanel', () => {
  it('renders nothing without a transport', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <I18n locale="en" messages={en}>
          <LlmTransportProvider>
            <LlmSessionProvider collection={collection} entry={entry}>
              <AiChatPanel collection={collection} entry={entry} onClose={() => {}} />
            </LlmSessionProvider>
          </LlmTransportProvider>
        </I18n>
      </Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the empty state and does not open a session until asked', () => {
    const openSession = vi.fn(() => createFakeSession().session);
    renderPanel({ openSession });

    expect(screen.getByText(en.editor.aiChat.welcome)).toBeInTheDocument();
    // Opening an entry is not consent to start a (possibly billed) session.
    expect(openSession).not.toHaveBeenCalled();
  });

  it('opens a session on the first prompt and sends it', async () => {
    const user = userEvent.setup();
    const { session } = createFakeSession();
    const openSession = vi.fn(() => session);
    renderPanel({ openSession });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Rewrite the title');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    expect(openSession).toHaveBeenCalledTimes(1);
    expect(session.sendPrompt).toHaveBeenCalledWith('Rewrite the title');
  });

  it('clears the composer after sending', async () => {
    const user = userEvent.setup();
    const { session } = createFakeSession();
    renderPanel({ openSession: () => session });

    const input = screen.getByLabelText(en.editor.aiChat.placeholder);
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    expect(input).toHaveValue('');
  });

  it('keeps the send button disabled for empty or whitespace input', async () => {
    const user = userEvent.setup();
    renderPanel({ openSession: () => createFakeSession().session });

    const send = screen.getByRole('button', { name: en.editor.aiChat.send });
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), '   ');
    expect(send).toBeDisabled();
  });

  it('re-renders the transcript when the session notifies', async () => {
    const user = userEvent.setup();
    const { session, notify } = createFakeSession();
    renderPanel({ openSession: () => session });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Hi');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    // Transports stream by mutating in place, so the panel must repaint on
    // notify rather than on a new array identity.
    (session.messages as LlmMessage[]).push(
      { id: '1', role: 'user', text: 'Hi' },
      { id: '2', role: 'assistant', text: 'Hello there' },
    );
    notify();

    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
  });

  it('surfaces tool activity in the transcript', async () => {
    const user = userEvent.setup();
    const { session, notify } = createFakeSession();
    renderPanel({ openSession: () => session });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Fix it');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    (session.messages as LlmMessage[]).push({
      id: '1',
      role: 'assistant',
      text: 'Done',
      toolCalls: [{ id: 't1', name: 'updateDocument', status: 'done', summary: 'updated title' }],
    });
    notify();

    await waitFor(() => expect(screen.getByText('updated title')).toBeInTheDocument());
  });

  it('disables the composer while streaming', async () => {
    const user = userEvent.setup();
    const { session, notify } = createFakeSession();
    renderPanel({ openSession: () => session });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Hi');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    (session as { status: LlmSession['status'] }).status = 'streaming';
    notify();

    await waitFor(() =>
      expect(screen.getByLabelText(en.editor.aiChat.placeholder)).toBeDisabled()
    );
    expect(screen.getByText(en.editor.aiChat.thinking)).toBeInTheDocument();
  });

  it('reports a failed send without losing the panel', async () => {
    const user = userEvent.setup();
    const { session } = createFakeSession({
      sendPrompt: vi.fn(async () => {
        throw new Error('upstream is down');
      }),
    });
    renderPanel({ openSession: () => session });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Hi');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    expect(await screen.findByRole('alert')).toHaveTextContent('upstream is down');
  });

  it('lists persisted conversations and resumes one', async () => {
    const user = userEvent.setup();
    const first = createFakeSession();
    const resumed = createFakeSession();
    const transport: LlmTransport = {
      openSession: () => first.session,
      listSessions: vi.fn(async () => [{ id: 'abc12345', title: 'Yesterday' }]),
      resumeSession: vi.fn(async () => resumed.session),
    };

    renderPanel(transport);

    const select = await screen.findByLabelText(en.editor.aiChat.conversations);
    expect(transport.listSessions).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'posts', slug: 'hello' }),
    );

    await user.selectOptions(select, 'abc12345');
    expect(transport.resumeSession).toHaveBeenCalledWith('abc12345', expect.any(Object));
  });

  it('hides the conversation bar when the transport does not persist sessions', () => {
    renderPanel({ openSession: () => createFakeSession().session });

    expect(screen.queryByLabelText(en.editor.aiChat.conversations)).not.toBeInTheDocument();
  });

  it('hands the transport a bridge that reads the open entry', async () => {
    const user = userEvent.setup();
    let bridge: LlmDocumentBridge | undefined;
    const { session } = createFakeSession();

    renderPanel({
      openSession: document => {
        bridge = document;
        return session;
      },
    });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Hi');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    expect(bridge?.read()).toEqual({ title: 'Hello' });
    expect(bridge?.context).toEqual({ collection: 'posts', slug: 'hello' });
    expect(bridge?.fields().map(field => field.name)).toEqual(['title']);
  });

  it('applies a transport-driven patch through the bridge to the draft', async () => {
    const user = userEvent.setup();
    let bridge: LlmDocumentBridge | undefined;
    const { session } = createFakeSession();

    renderPanel({
      openSession: document => {
        bridge = document;
        return session;
      },
    });

    await user.type(screen.getByLabelText(en.editor.aiChat.placeholder), 'Retitle it');
    await user.click(screen.getByRole('button', { name: en.editor.aiChat.send }));

    // What a real transport does when the model calls `updateDocument`.
    const result = bridge?.applyPatch([{ op: 'replace', path: '/title', value: 'Goodbye' }]);

    expect(result).toEqual({ changed: ['title'] });
    expect(dispatched).toContainEqual(
      expect.objectContaining({
        type: 'DRAFT_CHANGE_FIELD',
        payload: expect.objectContaining({ value: 'Goodbye' }),
      }),
    );
  });
});
