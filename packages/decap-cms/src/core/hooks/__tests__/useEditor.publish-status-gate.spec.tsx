import { render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';
import { AlertDialogHost, ConfirmDialogHost } from '@/ui';
import * as editorialWorkflowActions from '@/core/actions/editorialWorkflow';

import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type { Router, RouterUpdate } from '@/core/routing/router';

vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    publishUnpublishedEntry: vi.fn(() => () => Promise.resolve()),
  };
});

vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, deleteLocalBackup: vi.fn(() => () => Promise.resolve()) };
});

const fakeRouter: Router = {
  location: () => ({ pathname: '/collections/posts/entries/test-slug', search: '' }),
  push: () => {},
  replace: () => {},
  href: (path: string) => `#${path}`,
  subscribe: (_listener: (update: RouterUpdate) => void) => () => {},
  block: () => () => {},
};

function buildStore(entryStatus: string) {
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
          'posts.test-slug': { collection: 'posts', slug: 'test-slug', status: entryStatus },
        },
      },
    } as any,
    applyMiddleware(thunk),
  );
}

function renderEditor(entryStatus: string) {
  const store = buildStore(entryStatus);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <RouterProvider router={fakeRouter}>
        <I18n
          locale="en"
          messages={{
            'editor.editor.onPublishingNotReady': 'Please update status to "Ready" before publishing.',
            'editor.editor.onPublishingNotReadyTitle': 'Publish blocked',
            'editor.editor.onPublishing': 'Are you sure you want to publish this entry?',
            'editor.editor.onPublishingTitle': 'Publish entry',
            'editor.editor.onPublishingConfirm': 'Publish now',
            'editor.editor.onPublishingCancel': 'Cancel',
          }}
        >
          {children}
        </I18n>
      </RouterProvider>
    </Provider>
  );
  return renderHook(
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
}

describe('useEditor handlePublishEntry status gate (DCMS-2462)', () => {
  beforeEach(() => {
    vi.mocked(editorialWorkflowActions.publishUnpublishedEntry).mockClear();
  });

  it.each(['draft', 'pending_review'])(
    'blocks publishing a %s entry with a "Publish blocked" alert and never dispatches publish',
    async entryStatus => {
      render(<AlertDialogHost />);
      const { result } = renderEditor(entryStatus);

      void result.current.handlePublishEntry();

      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent('Publish blocked');
      expect(dialog).toHaveTextContent('Please update status to "Ready" before publishing.');
      expect(editorialWorkflowActions.publishUnpublishedEntry).not.toHaveBeenCalled();
    },
  );

  it('dispatches publish for a Ready, saved entry once the confirm prompt is accepted', async () => {
    render(<ConfirmDialogHost />);
    const { result } = renderEditor('pending_publish');

    void result.current.handlePublishEntry();

    await screen.findByRole('alertdialog');
    screen.getByRole('button', { name: 'Publish now' }).click();

    await waitFor(() =>
      expect(editorialWorkflowActions.publishUnpublishedEntry).toHaveBeenCalledWith('posts', 'test-slug'),
    );
  });
});
