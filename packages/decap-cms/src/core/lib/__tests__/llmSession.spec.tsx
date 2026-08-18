import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { LlmTransportProvider } from '@/core/lib/llm';
import { LlmSessionProvider, useLlmSession } from '@/core/lib/llmSession';

import type { CmsCollectionState, CmsEntry, LlmSession, LlmTransport } from '@/lib/util/index';
import type { Store } from 'redux';

/**
 * Direct coverage of the provider's lifecycle, complementing the indirect
 * exercise it gets as a dependency of `AiChatPanel.spec.tsx` and
 * `AiTranslateAction.spec.tsx`.
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

function createFakeSession(overrides: Partial<LlmSession> = {}) {
  return {
    messages: [],
    status: 'idle',
    sendPrompt: vi.fn(async () => {}),
    subscribe: () => () => {},
    dispose: vi.fn(),
    ...overrides,
  } as unknown as LlmSession;
}

function makeStore(): Store {
  return {
    getState: () => ({ entries: { entities: {} }, editorialWorkflow: { entities: {} } }),
    dispatch: (action: unknown) => action,
    subscribe: () => () => {},
    replaceReducer: () => {},
  } as unknown as Store;
}

/** Surfaces the context value to the test, re-captured on every render. */
function SessionProbe({
  onResolve,
}: {
  onResolve: (value: ReturnType<typeof useLlmSession>) => void;
}) {
  onResolve(useLlmSession());
  return null;
}

describe('LlmSessionProvider', () => {
  it('passes children through untouched, without a Redux Provider, when no transport is configured', () => {
    let captured: ReturnType<typeof useLlmSession>;

    render(
      <LlmTransportProvider>
        <LlmSessionProvider collection={collection} entry={entry}>
          <SessionProbe onResolve={value => (captured = value)} />
          <div>child content</div>
        </LlmSessionProvider>
      </LlmTransportProvider>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
    // No provider mounted means the context stays at its `createContext`
    // default: no AI UI can accidentally start driving a session.
    expect(captured).toBeUndefined();
  });

  it('lazily opens a session, only on the first ensureSession call', () => {
    const session = createFakeSession();
    const openSession = vi.fn(() => session);
    const transport: LlmTransport = { openSession };
    let captured: ReturnType<typeof useLlmSession>;

    render(
      <Provider store={makeStore()}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry}>
            <SessionProbe onResolve={value => (captured = value)} />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </Provider>,
    );

    // Opening an entry is not consent to open a (possibly billed) session.
    expect(openSession).not.toHaveBeenCalled();
    expect(captured?.session).toBeUndefined();

    act(() => {
      captured?.ensureSession();
    });

    expect(openSession).toHaveBeenCalledTimes(1);
    expect(captured?.session).toBe(session);

    act(() => {
      captured?.ensureSession();
    });

    // Already open: a second call reuses the same session rather than
    // opening another one.
    expect(openSession).toHaveBeenCalledTimes(1);
    expect(captured?.session).toBe(session);
  });

  it('resetSession disposes the current session so the next ensureSession starts fresh', () => {
    const first = createFakeSession();
    const second = createFakeSession();
    const openSession = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const transport: LlmTransport = { openSession };
    let captured: ReturnType<typeof useLlmSession>;

    render(
      <Provider store={makeStore()}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry}>
            <SessionProbe onResolve={value => (captured = value)} />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </Provider>,
    );

    act(() => {
      captured?.ensureSession();
    });
    expect(captured?.session).toBe(first);

    act(() => {
      captured?.resetSession();
    });

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(captured?.session).toBeUndefined();

    act(() => {
      captured?.ensureSession();
    });

    expect(openSession).toHaveBeenCalledTimes(2);
    expect(captured?.session).toBe(second);
  });

  it('resumeSession replaces the current session with a persisted one', async () => {
    const original = createFakeSession();
    const resumed = createFakeSession();
    const resumeSession = vi.fn(async () => resumed);
    const transport: LlmTransport = {
      openSession: () => original,
      resumeSession,
    };
    let captured: ReturnType<typeof useLlmSession>;

    render(
      <Provider store={makeStore()}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry}>
            <SessionProbe onResolve={value => (captured = value)} />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </Provider>,
    );

    act(() => {
      captured?.ensureSession();
    });
    expect(captured?.session).toBe(original);

    await act(async () => {
      await captured?.resumeSession('persisted-id');
    });

    expect(resumeSession).toHaveBeenCalledWith('persisted-id', expect.any(Object));
    expect(captured?.session).toBe(resumed);
    // The replaced session is no longer needed.
    expect(original.dispose).toHaveBeenCalledTimes(1);
  });

  it('resumeSession is a no-op when the transport does not support persistence', async () => {
    const session = createFakeSession();
    const transport: LlmTransport = { openSession: () => session };
    let captured: ReturnType<typeof useLlmSession>;

    render(
      <Provider store={makeStore()}>
        <LlmTransportProvider llm={transport}>
          <LlmSessionProvider collection={collection} entry={entry}>
            <SessionProbe onResolve={value => (captured = value)} />
          </LlmSessionProvider>
        </LlmTransportProvider>
      </Provider>,
    );

    act(() => {
      captured?.ensureSession();
    });

    await act(async () => {
      await captured?.resumeSession('persisted-id');
    });

    expect(captured?.session).toBe(session);
  });
});
