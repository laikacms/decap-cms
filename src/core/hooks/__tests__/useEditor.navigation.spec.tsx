import { act, renderHook } from '@testing-library/react';
import { createHashHistory } from 'history';
import React from 'react';
import { Provider } from 'react-redux';
import { I18n } from 'react-polyglot';
import { applyMiddleware, legacy_createStore as createStore, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { History, Listener, Transition } from 'history';
import type * as EntriesActions from '@/core/actions/entries';
import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type * as DeploysActions from '@/core/actions/deploys';
import type * as AuthActions from '@/core/actions/auth';

vi.mock('history');

// The action creators below dispatch real thunks (backend calls, media-library
// waits, etc.) that are out of scope for this test — we only exercise the
// dirty-navigation guard `setup()` wires up, not entry loading/persisting.
// Stub them to no-op thunks/actions so `setup()` can run without a full
// backend.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    loadEntry: vi.fn(() => () => {}),
    loadEntries: vi.fn(() => () => {}),
    createDraftDuplicateFromEntry: vi.fn(() => ({ type: 'noop/createDraftDuplicateFromEntry' })),
    createEmptyDraft: vi.fn(() => () => {}),
    persistEntry: vi.fn(() => () => {}),
    deleteEntry: vi.fn(() => () => {}),
    persistLocalBackup: vi.fn(() => () => {}),
    loadLocalBackup: vi.fn(() => ({ type: 'noop/loadLocalBackup' })),
    retrieveLocalBackup: vi.fn(() => () => Promise.resolve()),
    deleteLocalBackup: vi.fn(() => () => {}),
  };
});
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    updateUnpublishedEntryStatus: vi.fn(() => () => {}),
    publishUnpublishedEntry: vi.fn(() => () => {}),
    unpublishPublishedEntry: vi.fn(() => () => {}),
    deleteUnpublishedEntry: vi.fn(() => () => {}),
    loadUnpublishedEntry: vi.fn(() => () => {}),
    persistUnpublishedEntry: vi.fn(() => () => {}),
  };
});
vi.mock('@/core/actions/deploys', async importOriginal => {
  const actual = await importOriginal<typeof DeploysActions>();
  return {
    ...actual,
    loadDeployPreview: vi.fn(() => () => {}),
  };
});
vi.mock('@/core/actions/auth', async importOriginal => {
  const actual = await importOriginal<typeof AuthActions>();
  return {
    ...actual,
    logoutUser: vi.fn(() => ({ type: 'noop/logoutUser' })),
  };
});

/**
 * A controllable fake of the `history` package's hash-history instance.
 * `src/core/routing/router.ts` creates its `history` singleton with
 * `createHashHistory()` exactly once, at module-evaluation time — so this
 * fake must be wired in via `createHashHistory.mockReturnValue` *before*
 * anything that transitively imports `router.ts` is loaded (mirrors
 * `navigation.spec.ts`'s pattern). `defaultRouter.block`/`.push`/`.subscribe`
 * are thin wrappers over this instance, so driving it directly here exercises
 * the exact same surface a real `<Link>` click or hash edit would.
 */
let blocker: ((tx: Transition) => void) | null = null;
let listener: Listener | null = null;
const fakeLocation = { pathname: '/collections/posts/new', search: '', hash: '', state: null };

const fakeHistory = {
  location: fakeLocation,
  push: vi.fn((path: string) => {
    const nextLocation = { ...fakeLocation, pathname: path };
    if (blocker) {
      blocker({
        location: nextLocation as any,
        action: 'PUSH',
        retry: () => {
          Object.assign(fakeLocation, nextLocation);
          listener?.({ location: fakeLocation as any, action: 'PUSH' } as any);
        },
      } as any);
      return;
    }
    Object.assign(fakeLocation, nextLocation);
    listener?.({ location: fakeLocation as any, action: 'PUSH' } as any);
  }),
  replace: vi.fn((path: string) => {
    Object.assign(fakeLocation, { pathname: path });
    listener?.({ location: fakeLocation as any, action: 'REPLACE' } as any);
  }),
  listen: vi.fn((l: Listener) => {
    listener = l;
    return () => {
      listener = null;
    };
  }),
  block: vi.fn((b: (tx: Transition) => void) => {
    blocker = b;
    return () => {
      blocker = null;
    };
  }),
  createHref: vi.fn((loc: { pathname: string }) => `#${loc.pathname}`),
} as unknown as History;

vi.mocked(createHashHistory).mockReturnValue(fakeHistory);

// Deferred until after the mock above is wired: everything downstream of
// `router.ts` (including `useEditor`) must only load once `createHashHistory`
// is already stubbed.
const { useEditor } = await import('@/core/hooks/useEditor');
const { changeDraftField } = await import('@/core/actions/entries');
const { default: reducers } = await import('@/core/reducers');

function resetFakeHistory() {
  blocker = null;
  listener = null;
  Object.assign(fakeLocation, {
    pathname: '/collections/posts/new',
    search: '',
    hash: '',
    state: null,
  });
  vi.mocked(fakeHistory.push).mockClear();
  vi.mocked(fakeHistory.replace).mockClear();
  vi.mocked(fakeHistory.listen).mockClear();
  vi.mocked(fakeHistory.block).mockClear();
}

describe('useEditor dirty-navigation guard (DCMS-567)', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let activeCleanup: (() => void) | null = null;

  beforeEach(() => {
    resetFakeHistory();
    confirmSpy = vi.spyOn(window, 'confirm');
    activeCleanup = null;
  });

  afterEach(() => {
    // Each test's `setup()` registers real `window` listeners
    // (beforeunload/hashchange) — without tearing them down, a later test's
    // hash-dispatch would also re-trigger every earlier test's still-live
    // listener.
    activeCleanup?.();
    vi.restoreAllMocks();
  });

  function buildStore() {
    return createStore(
      combineReducers(reducers as any),
      {
        config: { publish_mode: 'simple', display_url: '' },
        collections: {
          posts: {
            name: 'posts',
            label: 'Posts',
            fields: [],
            type: 'folder_based_collection',
            folder: '_posts',
          },
        },
      } as any,
      applyMiddleware(thunk),
    );
  }

  async function setupDirtyNewEntryEditor() {
    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <I18n locale="en" messages={{ 'editor.editor.onLeavePage': 'You have unsaved changes.' }}>
          {children}
        </I18n>
      </Provider>
    );

    const { result, rerender } = renderHook(
      () =>
        useEditor({
          collectionName: 'posts',
          newEntry: true,
          locationSearch: '',
          locationPathname: '/collections/posts/new',
        }),
      { wrapper },
    );

    // Seed a fresh draft the same shape `createEmptyDraft` would leave behind
    // (we mocked that thunk out above since it needs a real backend).
    act(() => {
      store.dispatch({ type: 'DRAFT_CREATE_EMPTY', payload: { data: {} } } as any);
    });
    rerender();

    let cleanup = () => {};
    act(() => {
      ({ cleanup } = result.current.setup());
    });
    activeCleanup = cleanup;
    rerender();

    // Flip the draft dirty exactly like typing into a field does.
    act(() => {
      store.dispatch(
        changeDraftField({
          field: { name: 'title' } as any,
          value: 'hello',
          metadata: {},
          entries: [],
        }) as any,
      );
    });
    rerender();

    expect(result.current.hasChanged).toBe(true);

    return { store, cleanup, rerender };
  }

  it('arms history.block() once the new-entry draft becomes dirty', async () => {
    await setupDirtyNewEntryEditor();
    expect(blocker).not.toBeNull();
  });

  it('shows a confirm dialog on a router Link (PUSH) navigation while dirty, and blocks it on Cancel', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(false);

    fakeHistory.push('/collections/posts');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // Cancelled: location must not have advanced.
    expect(fakeLocation.pathname).toBe('/collections/posts/new');
  });

  it('allows a router Link (PUSH) navigation while dirty once the user confirms', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(true);

    fakeHistory.push('/collections/posts');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(fakeLocation.pathname).toBe('/collections/posts');
  });

  it('shows a confirm dialog on a direct hash/URL change while dirty (DCMS-286 POP safety net)', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(false);

    // Simulate the user editing the URL bar directly: the hash changes but
    // `history`'s own POP handling never sees it (it didn't create this
    // location), so only the native `hashchange` listener fires.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '#/collections/other' },
      writable: true,
    });
    window.dispatchEvent(new Event('hashchange'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});
