import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loginUser, logoutUser, sessionExpired } from '@/core/actions/auth';
import {
  UNPUBLISHED_ENTRY_DELETE_SUCCESS,
  UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
  UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
  UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
} from '@/core/actions/editorialWorkflow';
import { DRAFT_CHANGE_FIELD, ENTRY_DELETE_SUCCESS, ENTRY_PERSIST_SUCCESS } from '@/core/actions/entries';
import queryCore from '@/lib/util/queryCore';
import { createCrossTabSyncMiddleware } from '@/core/redux/middleware/crossTabSync';

import type { AnyAction, Dispatch, MiddlewareAPI } from 'redux';

/**
 * In-process BroadcastChannel double: delivers messages synchronously to
 * every other instance with the same name, and applies structured-clone
 * semantics on post (so non-cloneable payloads throw like the real thing).
 */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    const cloned = structuredClone(data);
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && other.name === this.name) {
        other.onmessage?.({ data: cloned } as MessageEvent);
      }
    }
  }

  close() {}
}

type Tab = {
  api: MiddlewareAPI & { dispatch: ReturnType<typeof vi.fn> },
  next: ReturnType<typeof vi.fn>,
  invoke: (action: AnyAction) => unknown,
};

function createTab(state: unknown = {}): Tab {
  const api = {
    dispatch: vi.fn(),
    getState: vi.fn(() => state),
  } as unknown as Tab['api'];
  const next = vi.fn((action: AnyAction) => action);
  const invoke = createCrossTabSyncMiddleware()(api)(next as unknown as Dispatch);
  return { api, next, invoke };
}

describe('crossTabSync middleware', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('replays whitelisted mutations in other tabs, marked as remote', () => {
    const tabA = createTab();
    const tabB = createTab();

    const action = {
      type: ENTRY_PERSIST_SUCCESS,
      payload: { collectionName: 'posts', entrySlug: 'hello', slug: 'hello', entry: { slug: 'hello', path: 'x.md' } },
    };
    tabA.invoke(action);

    expect(tabA.next).toHaveBeenCalledWith(action);
    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    const replayed = tabB.api.dispatch.mock.calls[0][0];
    expect(replayed.type).toBe(ENTRY_PERSIST_SUCCESS);
    expect(replayed.payload).toEqual(action.payload);
    expect(replayed.meta['crossTabSync/remote']).toBe(true);
  });

  it('never broadcasts per-tab actions (drafts, loads, view state)', () => {
    const tabA = createTab();
    const tabB = createTab();

    tabA.invoke({ type: DRAFT_CHANGE_FIELD, payload: { field: 'title', value: 'x' } });
    tabA.invoke({ type: 'ENTRIES_SUCCESS', payload: { collection: 'posts' } });
    tabA.invoke({ type: 'CHANGE_VIEW_STYLE', payload: 'list' });

    expect(tabB.api.dispatch).not.toHaveBeenCalled();
  });

  it('does not re-broadcast a replayed action (no echo loop)', () => {
    const tabA = createTab();
    const tabB = createTab();
    const tabC = createTab();

    tabA.invoke({
      type: ENTRY_DELETE_SUCCESS,
      payload: { collectionName: 'posts', entrySlug: 'hello' },
    });
    // B and C each received the replay exactly once...
    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    expect(tabC.api.dispatch).toHaveBeenCalledTimes(1);

    // ...and pushing B's replayed (remote-marked) action through B's own
    // dispatch chain must not broadcast again.
    tabB.invoke(tabB.api.dispatch.mock.calls[0][0]);
    expect(tabC.api.dispatch).toHaveBeenCalledTimes(1);
    expect(tabA.api.dispatch).not.toHaveBeenCalled();
  });

  it('mirrors queryCore invalidation when replaying a persist', () => {
    const invalidateTags = vi.spyOn(queryCore, 'invalidateTags').mockImplementation(() => {});
    const tabA = createTab();
    createTab();

    tabA.invoke({
      type: ENTRY_PERSIST_SUCCESS,
      payload: { collectionName: 'posts', entrySlug: 'old', slug: 'new', entry: { slug: 'new', path: 'x.md' } },
    });

    // Called once, by the receiving tab (the originating thunk does its own).
    expect(invalidateTags).toHaveBeenCalledTimes(1);
    expect(invalidateTags).toHaveBeenCalledWith([
      'collection:posts',
      'entry:posts/old',
      'entry:posts/new',
    ]);
  });

  it('replays logout and clears the receiving tab query cache', () => {
    const clear = vi.spyOn(queryCore, 'clear').mockImplementation(() => {});
    const tabA = createTab();
    const tabB = createTab();

    tabA.invoke({ type: logoutUser.pending.type, meta: { requestId: 'r1', requestStatus: 'pending' } });

    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    expect(tabB.api.dispatch.mock.calls[0][0].type).toBe(logoutUser.pending.type);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('replays session expiry', () => {
    const tabA = createTab();
    const tabB = createTab();

    tabA.invoke({ type: sessionExpired.type });

    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    expect(tabB.api.dispatch.mock.calls[0][0].type).toBe(sessionExpired.type);
  });

  it('translates a remote login into a local session restore', () => {
    const tabA = createTab();
    const loggedOutTab = createTab({ auth: { user: undefined } });
    const loggedInTab = createTab({ auth: { user: { login: 'sem' }, sessionExpired: false } });
    const expiredTab = createTab({ auth: { user: { login: 'sem' }, sessionExpired: true } });

    tabA.invoke({ type: loginUser.fulfilled.type, payload: { login: 'sem' } });

    // Signed-out and expired tabs restore from storage (authenticateUser
    // thunk); an already signed-in tab does nothing.
    expect(loggedOutTab.api.dispatch).toHaveBeenCalledTimes(1);
    expect(loggedOutTab.api.dispatch).toHaveBeenCalledWith(expect.any(Function));
    expect(expiredTab.api.dispatch).toHaveBeenCalledTimes(1);
    expect(expiredTab.api.dispatch).toHaveBeenCalledWith(expect.any(Function));
    expect(loggedInTab.api.dispatch).not.toHaveBeenCalled();
  });

  it('sanitizes a function-valued payload instead of dropping the broadcast', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tabA = createTab();
    const tabB = createTab();

    const action = {
      type: ENTRY_DELETE_SUCCESS,
      payload: { collectionName: 'posts', entrySlug: 'hello', oops: () => {} },
    };
    expect(() => tabA.invoke(action)).not.toThrow();

    expect(tabA.next).toHaveBeenCalledWith(action);
    // Local dispatch keeps the untouched action (function included) — only
    // the broadcast copy is sanitized.
    expect(action.payload.oops).toEqual(expect.any(Function));

    // The sibling tab still receives a replayed action, with the
    // non-cloneable key stripped rather than the whole broadcast dropped.
    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    const replayed = tabB.api.dispatch.mock.calls[0][0];
    expect(replayed.type).toBe(ENTRY_DELETE_SUCCESS);
    expect(replayed.payload).toEqual({ collectionName: 'posts', entrySlug: 'hello' });
    expect('oops' in replayed.payload).toBe(false);

    // No more silent-warn spam on every save.
    expect(warn).not.toHaveBeenCalled();
  });

  it('strips an AssetProxy-shaped toBase64 closure from mediaFiles before broadcasting', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tabA = createTab();
    const tabB = createTab();

    const action = {
      type: UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
      payload: {
        collection: 'faq',
        entry: {
          slug: 'hello',
          path: 'faq/hello.md',
          mediaFiles: [
            { id: 'asset-1', name: 'logo.png', url: '/media/logo.png', toBase64: async () => 'ZmFrZQ==' },
          ],
        },
      },
    };
    expect(() => tabA.invoke(action)).not.toThrow();

    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    const replayed = tabB.api.dispatch.mock.calls[0][0];
    expect(replayed.payload.entry.mediaFiles).toEqual([
      { id: 'asset-1', name: 'logo.png', url: '/media/logo.png' },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    UNPUBLISHED_ENTRY_PERSIST_SUCCESS,
    UNPUBLISHED_ENTRY_STATUS_CHANGE_SUCCESS,
    UNPUBLISHED_ENTRY_PUBLISH_SUCCESS,
    UNPUBLISHED_ENTRY_DELETE_SUCCESS,
    ENTRY_PERSIST_SUCCESS,
    ENTRY_DELETE_SUCCESS,
  ])('broadcasts %s with a function-valued payload without warning', type => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tabA = createTab();
    const tabB = createTab();

    const action = {
      type,
      payload: {
        collection: 'posts',
        collectionName: 'posts',
        slug: 'hello',
        entrySlug: 'hello',
        entry: { slug: 'hello', path: 'x.md', mediaFiles: [{ id: 'a', toBase64: async () => '' }] },
      },
    };
    expect(() => tabA.invoke(action)).not.toThrow();

    expect(tabB.api.dispatch).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('is a pass-through when BroadcastChannel is unavailable', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const tabA = createTab();

    const action = { type: ENTRY_DELETE_SUCCESS, payload: { collectionName: 'posts', entrySlug: 'hello' } };
    expect(tabA.invoke(action)).toBe(action);
    expect(tabA.next).toHaveBeenCalledWith(action);
  });
});
