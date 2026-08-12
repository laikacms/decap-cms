import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
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
import { ConfirmDialogHost } from '@/ui';

import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterBlocker, RouterTransition, RouterUpdate } from '@/core/routing/router';

// `setup()` dispatches real thunks (backend calls) for local-backup retrieval
// and entry loading that are out of scope here — we only exercise the
// dirty-navigation confirm-dialog labels, not entry loading/persisting.
// Mirrors the stubs in `useEditor.navigation.spec.tsx`.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    loadEntry: vi.fn(() => () => {}),
    loadEntries: vi.fn(() => () => {}),
    createEmptyDraft: vi.fn(() => () => {}),
    retrieveLocalBackup: vi.fn(() => () => Promise.resolve()),
  };
});

/**
 * Minimal controllable fake of the `Router` port, just enough to arm
 * `router.block()` and deliver a held transition — mirrors the fake in
 * `useEditor.navigation.spec.tsx`, trimmed to what this label-only assertion
 * needs (no POP/allowedPaths exercise here).
 */
let blockers: RouterBlocker[] = [];
let listeners: ((update: RouterUpdate) => void)[] = [];
const fakeLocation = { pathname: '/collections/posts/new', search: '' };

function notify(action: RouterUpdate['action']) {
  [...listeners].forEach(listener => listener({ location: { ...fakeLocation }, action }));
}

const fakeRouter: Router = {
  location: () => ({ ...fakeLocation }),
  push: (path: string) => {
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
  },
  replace: (path: string) => {
    fakeLocation.pathname = path;
    notify('REPLACE');
  },
  href: (path: string) => `#${path}`,
  subscribe: (listener: (update: RouterUpdate) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  block: (blocker: RouterBlocker) => {
    blockers.push(blocker);
    return () => {
      blockers = blockers.filter(b => b !== blocker);
    };
  },
};

function resetFakeRouter() {
  blockers = [];
  listeners = [];
  fakeLocation.pathname = '/collections/posts/new';
  fakeLocation.search = '';
}

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

describe('useEditor leave-page prompt button labels (DCMS-2031)', () => {
  let activeCleanup: (() => void) | null = null;

  beforeEach(() => {
    resetFakeRouter();
    activeCleanup = null;
  });

  afterEach(() => {
    activeCleanup?.();
  });

  it('renders explicit leave/stay labels instead of the generic OK/Cancel defaults', async () => {
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
              'editor.editor.onLeavePage': 'Are you sure you want to leave this page?',
              'editor.editor.onLeavePageTitle': 'Unsaved changes',
              'editor.editor.onLeavePageConfirm': 'Leave page',
              'editor.editor.onLeavePageCancel': 'Stay on this page',
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

    // Seed a fresh draft the same shape `createEmptyDraft` would leave behind
    // (this test never dispatches the real thunk, since it needs a backend).
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

    // Flip the draft dirty exactly like typing into a field does, so the
    // arm-on-dirty effect installs `navigationBlocker` on `router.block()`.
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
    expect(blockers.length).toBeGreaterThan(0);

    // Attempt an in-app navigation while dirty; deliberately not awaited —
    // `confirmDialog` doesn't resolve until the dialog is answered below.
    act(() => {
      fakeRouter.push('/collections/posts');
    });

    await screen.findByRole('alertdialog');

    // The affirmative/negative outcome must be unambiguous from the button
    // chrome alone — no generic "Cancel"/"OK" on this specific prompt.
    expect(screen.getByRole('button', { name: 'Leave page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay on this page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    // Cancelling (answering "Stay on this page") must not have advanced the
    // route — no behaviour change beyond copy.
    act(() => {
      screen.getByRole('button', { name: 'Stay on this page' }).click();
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(fakeLocation.pathname).toBe('/collections/posts/new');
  });
});
