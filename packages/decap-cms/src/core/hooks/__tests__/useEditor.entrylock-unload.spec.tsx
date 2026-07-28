import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as backendModule from '@/core/backend';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';

import type * as AuthActions from '@/core/actions/auth';
import type * as DeploysActions from '@/core/actions/deploys';
import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterBlocker, RouterTransition, RouterUpdate } from '@/core/routing/router';

// Same rationale as useEditor.navigation.spec.tsx: stub out the thunks that
// need a real backend so `setup()` can run standalone. We deliberately leave
// `@/core/actions/entryLock` un-mocked -- that's the code path this suite
// exercises -- and mock `@/core/backend`'s `currentBackend` instead, one
// layer down, the same way `entryLock.spec.tsx` does.
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
vi.mock('@/core/backend');

const fakeLocation = { pathname: '/collections/posts/entries/my-post', search: '' };
const fakeRouter: Router = {
  location: () => ({ ...fakeLocation }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn((_listener: (update: RouterUpdate) => void) => () => {}),
  block: vi.fn((_blocker: RouterBlocker) => () => {}),
};

describe('useEditor advisory-lock release on tab-close (DCMS-1578)', () => {
  let activeCleanup: (() => void) | null = null;
  let releaseEntryLockMock: ReturnType<typeof vi.fn>;
  let acquireEntryLockMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    activeCleanup = null;
    releaseEntryLockMock = vi.fn().mockResolvedValue(undefined);
    acquireEntryLockMock = vi.fn().mockResolvedValue({
      path: 'posts/my-post',
      owner: { id: 'alice', name: 'Alice' },
      acquiredAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:05:00.000Z',
    });
    vi.mocked(backendModule.currentBackend).mockReturnValue({
      supportsEntryLocking: () => true,
      acquireEntryLock: acquireEntryLockMock,
      releaseEntryLock: releaseEntryLockMock,
      refreshEntryLock: vi.fn().mockResolvedValue(null),
    } as any);
  });

  afterEach(() => {
    activeCleanup?.();
    vi.restoreAllMocks();
  });

  function buildStore() {
    return createStore(
      combineReducers(reducers as any),
      {
        config: { publish_mode: 'simple', display_url: '' },
        auth: { user: { login: 'alice', name: 'Alice' } },
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

  async function setupOpenEntryEditor() {
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
          slug: 'my-post',
          newEntry: false,
          locationSearch: '',
          locationPathname: '/collections/posts/entries/my-post',
        }),
      { wrapper },
    );

    let cleanup = () => {};
    await act(async () => {
      ({ cleanup } = result.current.setup());
    });
    activeCleanup = cleanup;
    rerender();

    expect(acquireEntryLockMock).toHaveBeenCalledWith(
      'posts/my-post',
      { id: 'alice', name: 'Alice' },
      false,
    );

    return { store, cleanup, rerender };
  }

  it('releases the lock on pagehide (tab close / off-site navigation)', async () => {
    await setupOpenEntryEditor();

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(releaseEntryLockMock).toHaveBeenCalledWith(
      'posts/my-post',
      { id: 'alice', name: 'Alice' },
    );
  });

  it('does not release the lock merely on beforeunload (native dialog may still be cancelled)', async () => {
    await setupOpenEntryEditor();

    await act(async () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
    });

    expect(releaseEntryLockMock).not.toHaveBeenCalled();
  });

  it('does not double-release when pagehide fires and the component then unmounts via cleanup', async () => {
    const { cleanup } = await setupOpenEntryEditor();

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(releaseEntryLockMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      cleanup();
    });
    activeCleanup = null;

    expect(releaseEntryLockMock).toHaveBeenCalledTimes(1);
  });

  it('still releases the lock via the cleanup effect on in-app navigation (no pagehide fired)', async () => {
    const { cleanup } = await setupOpenEntryEditor();

    await act(async () => {
      cleanup();
    });
    activeCleanup = null;

    expect(releaseEntryLockMock).toHaveBeenCalledTimes(1);
  });
});
