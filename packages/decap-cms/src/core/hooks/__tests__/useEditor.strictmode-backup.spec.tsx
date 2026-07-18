import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localBackupRetrieved } from '@/core/actions/entries';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';
import { ConfirmDialogHost } from '@/ui';

import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterUpdate } from '@/core/routing/router';

// `handleLocalBackupCheck`'s else-branch dispatches this thunk to wipe the
// local backup from storage. We only want to assert whether it fires, not
// exercise the real backend it depends on.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    deleteLocalBackup: vi.fn(() => () => {}),
  };
});

// Minimal fake router — `useEditor` reads `useRouter()` unconditionally, but
// this test never calls `setup()`, so none of the blocking/subscribing
// surface is exercised.
const fakeRouter: Router = {
  location: () => ({ pathname: '/collections/posts/new', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn((_listener: (update: RouterUpdate) => void) => () => {}),
  block: vi.fn(() => () => {}),
};

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

describe('useEditor local-backup prompt under StrictMode remount (DCMS-1141)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('still shows the confirm-load-backup dialog after a StrictMode mount-cleanup-remount cycle, instead of silently deleting the backup', async () => {
    const { deleteLocalBackup } = await import('@/core/actions/entries');

    // `ConfirmDialogHost` is a module-singleton queue consumer (subscribes via
    // `useSyncExternalStore`); mounting it anywhere makes `confirmDialog(...)`
    // queue a real dialog instead of falling back to `window.confirm`.
    render(<ConfirmDialogHost />);

    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <RouterProvider router={fakeRouter}>
          <I18n locale="en" messages={{ 'editor.editor.confirmLoadBackup': 'Load your unsaved backup?' }}>
            {children}
          </I18n>
        </RouterProvider>
      </Provider>
    );

    // `reactStrictMode: true` wraps the whole rendered tree in
    // `<React.StrictMode>` at the React root (matching `app/index.ts`'s real
    // app-root wrapping) and reliably drives React's mount → cleanup →
    // remount double-invoke of `[]`-effects. Manually nesting
    // `<React.StrictMode>` *inside* the `wrapper` component instead does not
    // reproduce the double-invoke in this RTL/React version — confirmed
    // empirically before writing this test.
    const { result, rerender } = renderHook(
      () =>
        useEditor({
          collectionName: 'posts',
          newEntry: true,
          locationSearch: '',
          locationPathname: '/collections/posts/new',
        }),
      { wrapper, reactStrictMode: true },
    );

    // Under React 18+ StrictMode, the hook's `[]`-effect above has already run
    // through its simulated mount → cleanup → remount cycle by this point. The
    // bug this test guards against: without the fix, that simulated cleanup
    // aborts the *only* `AbortController` the ref will ever hold, so every
    // `confirmDialog(..., signal)` call for the rest of this component's real
    // lifetime resolves `false` synchronously with no dialog ever queued.

    // Simulate `retrieveLocalBackup` finding a persisted draft.
    act(() => {
      store.dispatch(
        localBackupRetrieved({ path: 'posts/test.md', data: { title: 'Recovered' } } as any),
      );
    });
    rerender();

    expect(result.current.localBackup).toBeTruthy();

    act(() => {
      void result.current.handleLocalBackupCheck(undefined);
    });

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Load your unsaved backup?');

    // The prompt is still pending an answer — the backup must not have been
    // silently discarded.
    expect(deleteLocalBackup).not.toHaveBeenCalled();
  });
});
