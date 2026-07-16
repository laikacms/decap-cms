import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { changeDraftField } from '@/core/actions/entries';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';

import type * as AuthActions from '@/core/actions/auth';
import type * as DeploysActions from '@/core/actions/deploys';
import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterBlocker, RouterTransition, RouterUpdate } from '@/core/routing/router';

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
 * A controllable fake of the `Router` port, injected through `RouterProvider`
 * (the same way a consumer-supplied router would be). It mirrors the real
 * default router's blocking contract: with a blocker armed, `push` and POPs
 * are held (the location does not advance) and only the transition's
 * `retry()` re-performs them — so driving this fake exercises the exact same
 * surface a real `<Link>` click or browser back would.
 */
let blockers: RouterBlocker[] = [];
let listeners: ((update: RouterUpdate) => void)[] = [];
const fakeLocation = { pathname: '/collections/posts/new', search: '' };

function notify(action: RouterUpdate['action']) {
  [...listeners].forEach(listener => listener({ location: { ...fakeLocation }, action }));
}

const fakeRouter: Router = {
  location: () => ({ ...fakeLocation }),
  push: vi.fn((path: string) => {
    const apply = () => {
      fakeLocation.pathname = path;
      notify('PUSH');
    };
    if (blockers.length) {
      const tx: RouterTransition = {
        location: { pathname: path, search: '' },
        action: 'PUSH',
        retry: apply,
      };
      [...blockers].forEach(blocker => blocker(tx));
      return;
    }
    apply();
  }),
  replace: vi.fn((path: string) => {
    fakeLocation.pathname = path;
    notify('REPLACE');
  }),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn((listener: (update: RouterUpdate) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }),
  block: vi.fn((blocker: RouterBlocker) => {
    blockers.push(blocker);
    return () => {
      blockers = blockers.filter(b => b !== blocker);
    };
  }),
};

/**
 * Simulates a POP-type navigation (browser back/forward or a direct URL-bar
 * hash edit) the way the real hash history delivers it: with a blocker armed
 * the URL change is reverted first and the blocker receives the transition
 * (`retry()` re-performs it); with no blocker the navigation just applies.
 */
function simulatePop(path: string) {
  const apply = () => {
    fakeLocation.pathname = path;
    notify('POP');
  };
  if (blockers.length) {
    const tx: RouterTransition = {
      location: { pathname: path, search: '' },
      action: 'POP',
      retry: apply,
    };
    [...blockers].forEach(blocker => blocker(tx));
    return;
  }
  apply();
}

function resetFakeRouter() {
  blockers = [];
  listeners = [];
  fakeLocation.pathname = '/collections/posts/new';
  fakeLocation.search = '';
  vi.mocked(fakeRouter.push).mockClear();
  vi.mocked(fakeRouter.replace).mockClear();
  vi.mocked(fakeRouter.subscribe).mockClear();
  vi.mocked(fakeRouter.block!).mockClear();
}

describe('useEditor dirty-navigation guard (DCMS-567)', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let activeCleanup: (() => void) | null = null;

  beforeEach(() => {
    resetFakeRouter();
    confirmSpy = vi.spyOn(window, 'confirm');
    activeCleanup = null;
  });

  afterEach(() => {
    // Each test's `setup()` registers a real `window` beforeunload listener
    // and arms the shared fake's blocker — tear both down so a later test
    // doesn't re-trigger an earlier test's still-live guard.
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
        <RouterProvider router={fakeRouter}>
          <I18n locale="en" messages={{ 'editor.editor.onLeavePage': 'You have unsaved changes.' }}>
            {children}
          </I18n>
        </RouterProvider>
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

  it('arms router.block() once the new-entry draft becomes dirty', async () => {
    await setupDirtyNewEntryEditor();
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('shows a confirm dialog on a router Link (PUSH) navigation while dirty, and blocks it on Cancel', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(false);

    act(() => {
      fakeRouter.push('/collections/posts');
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // Cancelled: location must not have advanced.
    expect(fakeLocation.pathname).toBe('/collections/posts/new');
  });

  it('allows a router Link (PUSH) navigation while dirty once the user confirms', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(true);

    act(() => {
      fakeRouter.push('/collections/posts');
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(fakeLocation.pathname).toBe('/collections/posts');
  });

  it('shows a confirm dialog on a POP (browser back / URL-bar edit) while dirty, and blocks it on Cancel (DCMS-286)', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(false);

    // The in-house hash history routes every POP through the armed blocker
    // (including entries it did not create), so a URL-bar edit or browser
    // back arrives here as a POP transition.
    act(() => {
      simulatePop('/collections/other');
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    // Cancelled: location must not have advanced.
    expect(fakeLocation.pathname).toBe('/collections/posts/new');
  });

  it('allows a POP navigation while dirty once the user confirms', async () => {
    await setupDirtyNewEntryEditor();
    confirmSpy.mockReturnValue(true);

    act(() => {
      simulatePop('/collections/other');
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(fakeLocation.pathname).toBe('/collections/other');
  });
});
