import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, it } from 'vitest';

import { localBackupRetrieved } from '@/core/actions/entries';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';
import { ConfirmDialogHost } from '@/ui';

import type { Router, RouterUpdate } from '@/core/routing/router';

// Minimal fake router — `useEditor` reads `useRouter()` unconditionally, but
// this test never calls `setup()`, so none of the blocking/subscribing
// surface is exercised.
const fakeRouter: Router = {
  location: () => ({ pathname: '/collections/posts/new', search: '' }),
  push: () => {},
  replace: () => {},
  href: (path: string) => `#${path}`,
  subscribe: (_listener: (update: RouterUpdate) => void) => () => {},
  block: () => () => {},
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

describe('useEditor local-backup prompt button labels (DCMS-2028)', () => {
  it('renders explicit restore/ignore labels instead of the generic OK/Cancel defaults', async () => {
    // `ConfirmDialogHost` is a module-singleton queue consumer (subscribes via
    // `useSyncExternalStore`); mounting it anywhere makes `confirmDialog(...)`
    // queue a real dialog instead of falling back to `window.confirm`.
    render(<ConfirmDialogHost />);

    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <RouterProvider router={fakeRouter}>
          <I18n
            locale="en"
            messages={{
              'editor.editor.confirmLoadBackup':
                'A local backup was recovered for this entry, would you like to use it?',
              'editor.editor.confirmLoadBackupTitle': 'Restore backup',
              'editor.editor.confirmLoadBackupConfirm': 'Restore draft',
              'editor.editor.confirmLoadBackupCancel': 'Ignore backup',
            }}
          >
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

    await screen.findByRole('alertdialog');

    // The affirmative/negative outcome must be unambiguous from the button
    // chrome alone — no generic "Cancel"/"OK" on this specific prompt.
    expect(screen.getByRole('button', { name: 'Restore draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ignore backup' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
