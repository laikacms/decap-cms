import { render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';

import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';
import { ConfirmDialogHost } from '@/ui';

import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type { Router, RouterUpdate } from '@/core/routing/router';

// `handleUnpublishEntry` dispatches a real backend-calling thunk once the
// prompt is confirmed and then navigates away. This test only exercises the
// confirm-prompt labels (DCMS-2061) and never confirms, so this mock only
// guards against a stray dispatch if a future regression skipped the confirm.
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    unpublishPublishedEntry: vi.fn(() => () => Promise.resolve()),
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
    } as any,
    applyMiddleware(thunk),
  );
}

describe('useEditor unpublish prompt button labels (DCMS-2061)', () => {
  it('renders explicit unpublish/cancel labels instead of the generic OK/Cancel defaults', async () => {
    render(<ConfirmDialogHost />);

    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <RouterProvider router={fakeRouter}>
          <I18n
            locale="en"
            messages={{
              'editor.editor.onUnpublishing': 'Are you sure you want to unpublish this entry?',
              'editor.editor.onUnpublishingTitle': 'Unpublish entry',
              'editor.editor.onUnpublishingConfirm': 'Unpublish',
              'editor.editor.onUnpublishingCancel': 'Cancel',
            }}
          >
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

    void result.current.handleUnpublishEntry();

    await screen.findByRole('alertdialog');

    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();

    // Settle the prompt by cancelling so the real unpublish thunk never fires.
    screen.getByRole('button', { name: 'Cancel' })!.click();
  });
});
