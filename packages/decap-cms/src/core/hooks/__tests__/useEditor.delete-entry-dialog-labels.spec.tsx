import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { changeDraftField } from '@/core/actions/entries';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';
import { ConfirmDialogHost } from '@/ui';

import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterUpdate } from '@/core/routing/router';

// `handleDeleteEntry` dispatches a real backend-calling `deleteEntry` thunk
// once confirmed (via a `setTimeout(..., 0)`). This test only exercises the
// confirm-prompt labels (DCMS-2061) and always cancels, so this mock only
// guards against a stray dispatch if a future regression skipped the confirm.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    deleteEntry: vi.fn(() => () => Promise.resolve()),
  };
});

const fakeRouter: Router = {
  location: () => ({ pathname: '/collections/posts/entries/test-slug', search: '' }),
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

const messages = {
  'editor.editor.onDeleteWithUnsavedChanges':
    'Are you sure you want to delete this published entry, as well as your unsaved changes from the current session?',
  'editor.editor.onDeleteWithUnsavedChangesTitle': 'Delete entry',
  'editor.editor.onDeleteWithUnsavedChangesConfirm': 'Delete entry',
  'editor.editor.onDeleteWithUnsavedChangesCancel': 'Keep editing',
  'editor.editor.onDeletePublishedEntry': 'Are you sure you want to delete this published entry?',
  'editor.editor.onDeletePublishedEntryTitle': 'Delete entry',
  'editor.editor.onDeletePublishedEntryConfirm': 'Delete entry',
  'editor.editor.onDeletePublishedEntryCancel': 'Keep entry',
};

describe('useEditor delete-entry prompt button labels (DCMS-2061)', () => {
  let activeCleanup: (() => void) | null = null;

  afterEach(() => {
    activeCleanup?.();
    activeCleanup = null;
  });

  it('renders "Delete entry" / "Keep entry" for a clean published entry (no unsaved changes)', async () => {
    render(<ConfirmDialogHost />);

    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <RouterProvider router={fakeRouter}>
          <I18n locale="en" messages={messages}>
            {children}
          </I18n>
        </RouterProvider>
      </Provider>
    );

    const { result } = renderHook(
      () =>
        useEditor({
          collectionName: 'posts',
          slug: 'test-slug',
          newEntry: false,
          locationSearch: '',
          locationPathname: '/collections/posts/entries/test-slug',
        }),
      { wrapper },
    );

    void result.current.handleDeleteEntry();

    await screen.findByRole('alertdialog');

    expect(screen.getByRole('button', { name: 'Delete entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep entry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: 'Keep entry' }).click();
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it(
    'renders a distinct "Delete entry" / "Keep editing" step first when there are unsaved changes, ' +
      'not the same pair as the clean-entry step (two-step delete flow, DCMS-2061 AC3)',
    async () => {
      render(<ConfirmDialogHost />);

      const store = buildStore();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>
          <RouterProvider router={fakeRouter}>
            <I18n locale="en" messages={messages}>
              {children}
            </I18n>
          </RouterProvider>
        </Provider>
      );

      const { result, rerender } = renderHook(
        () =>
          useEditor({
            collectionName: 'posts',
            slug: 'test-slug',
            newEntry: false,
            locationSearch: '',
            locationPathname: '/collections/posts/entries/test-slug',
          }),
        { wrapper },
      );

      // Seed a draft and mark it dirty, same shape `changeDraftField` leaves
      // behind, so `handleDeleteEntry` takes the unsaved-changes branch.
      act(() => {
        store.dispatch({ type: 'DRAFT_CREATE_EMPTY', payload: { data: {} } } as any);
      });
      rerender();
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

      void result.current.handleDeleteEntry();

      await screen.findByRole('alertdialog');

      // This is the first of the two-step flow: distinct from the
      // "Delete entry" / "Keep entry" pair asserted above — the cancel
      // label here is "Keep editing", not "Keep entry".
      expect(screen.getByRole('button', { name: 'Delete entry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Keep entry' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

      act(() => {
        screen.getByRole('button', { name: 'Keep editing' }).click();
      });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    },
  );
});
