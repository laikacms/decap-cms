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

import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type { Router, RouterUpdate } from '@/core/routing/router';

// `handleDeleteUnpublishedChanges` dispatches a real backend-calling thunk
// once confirmed. This test only exercises the confirm-prompt labels
// (DCMS-2061) and always cancels, so this mock only guards against a stray
// dispatch if a future regression skipped the confirm.
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    deleteUnpublishedEntry: vi.fn(() => () => Promise.resolve()),
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
      config: { publish_mode: 'editorial_workflow', display_url: '' },
      collections: {
        posts: {
          name: 'posts',
          label: 'Posts',
          fields: [],
          type: 'folder_based_collection',
          folder: '_posts',
        },
      },
      editorialWorkflow: {
        entities: {
          'posts.test-slug': { collection: 'posts', slug: 'test-slug', status: 'draft' },
        },
      },
    } as any,
    applyMiddleware(thunk),
  );
}

const messages = {
  'editor.editor.onDeleteUnpublishedChangesWithUnsavedChanges':
    'This will delete all unpublished changes to this entry, as well as your unsaved changes from the current session. Do you still want to delete?',
  'editor.editor.onDeleteUnpublishedChangesWithUnsavedChangesTitle': 'Delete unpublished changes',
  'editor.editor.onDeleteUnpublishedChangesWithUnsavedChangesConfirm': 'Discard changes',
  'editor.editor.onDeleteUnpublishedChangesWithUnsavedChangesCancel': 'Keep editing',
  'editor.editor.onDeleteUnpublishedChanges':
    'All unpublished changes to this entry will be deleted. Do you still want to delete?',
  'editor.editor.onDeleteUnpublishedChangesTitle': 'Delete unpublished changes',
  'editor.editor.onDeleteUnpublishedChangesConfirm': 'Discard changes',
  'editor.editor.onDeleteUnpublishedChangesCancel': 'Keep changes',
};

describe('useEditor delete-unpublished-changes prompt button labels (DCMS-2061)', () => {
  let activeCleanup: (() => void) | null = null;

  afterEach(() => {
    activeCleanup?.();
    activeCleanup = null;
  });

  it('renders "Discard changes" / "Keep changes" when there are no unsaved editor changes', async () => {
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

    void result.current.handleDeleteUnpublishedChanges();

    await screen.findByRole('alertdialog');

    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep changes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: 'Keep changes' }).click();
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it(
    'renders a distinct "Discard changes" / "Keep editing" step first when there are unsaved editor ' +
      'changes, not the same pair as the no-unsaved-changes step (two-step delete flow, DCMS-2061 AC3)',
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
      // behind, so `handleDeleteUnpublishedChanges` takes the
      // unsaved-changes branch first.
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

      void result.current.handleDeleteUnpublishedChanges();

      await screen.findByRole('alertdialog');

      // This is the first of the two-step flow: distinct from the
      // "Discard changes" / "Keep changes" pair asserted above — the cancel
      // label here is "Keep editing", not "Keep changes".
      expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Keep changes' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

      act(() => {
        screen.getByRole('button', { name: 'Keep editing' }).click();
      });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    },
  );
});
