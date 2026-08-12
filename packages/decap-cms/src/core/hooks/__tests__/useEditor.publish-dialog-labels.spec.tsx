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

// `handlePublishEntry` dispatches a real backend-calling thunk once the
// prompt is confirmed. This test only exercises the confirm-prompt labels
// (DCMS-2061), so it never confirms — the mock exists purely so a stray
// dispatch wouldn't crash if a future regression skipped the confirm step.
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    publishUnpublishedEntry: vi.fn(() => () => Promise.resolve()),
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
          'posts.test-slug': { collection: 'posts', slug: 'test-slug', status: 'pending_publish' },
        },
      },
    } as any,
    applyMiddleware(thunk),
  );
}

describe('useEditor publish prompt button labels (DCMS-2061)', () => {
  it('renders explicit publish/cancel labels instead of the generic OK/Cancel defaults', async () => {
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

    void result.current.handlePublishEntry();

    await screen.findByRole('alertdialog');

    // The affirmative/negative outcome must be unambiguous from the button
    // chrome alone — no generic "Cancel"/"OK" on this specific prompt.
    expect(screen.getByRole('button', { name: 'Publish now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();

    // Settle the prompt by cancelling so the real publish thunk never fires.
    screen.getByRole('button', { name: 'Cancel' })!.click();
  });
});
