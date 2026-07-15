import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';


// Pass-through translate/useTranslate so `AppContent` doesn't need a real
// `@/core/i18n` `<I18n>` ancestor.
vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate:
    () =>
    (Component: React.ComponentType<any>) =>
    (props: any) => <Component {...props} t={(key: string) => key} />,
}));

// Stub the heavy page components - this spec only cares about which of the
// app-shell header / routed page mounts for a given route, not their guts.
vi.mock('../Header', () => ({
  default: () => <header data-testid="app-header">App Header</header>,
}));
vi.mock('../../../core/components/Collection/Collection', () => ({
  default: () => <div data-testid="collection-view" />,
}));
vi.mock('../../../core/components/Workflow/Workflow', () => ({
  default: () => <div data-testid="workflow-view" />,
}));
vi.mock('../../../core/components/Editor/Editor', () => ({
  default: () => <div data-testid="editor-view" />,
}));
vi.mock('../../../core/components/MediaLibrary/MediaLibrary', () => ({
  default: () => <div data-testid="media-library" />,
}));
vi.mock('../../../core/components/UI', async () => {
  const actual = await vi.importActual<UIModule>('../../../core/components/UI');
  return {
    ...actual,
    Notifications: () => null,
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { AppContent } from '@/app/components/App';
import { context } from '@/core/contexts/decap';
import { defaultRoutingTable } from '@/core/routing/router';

import type * as UIModule from '@/core/components/UI';
import type { AppLayoutRenderProps } from '@/app/components/App';

// Thunk middleware is required because `openMediaLibrary` (dispatched by the
// DCMS-578 /media route) is a thunk, not a plain action.
const mockStore = configureStore([thunk]);

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    auth: { user: { name: 'Alice', login: 'alice' }, isFetching: false, error: null },
    config: { isFetching: false, error: null, backend: { name: 'test-repo' } },
    collections: {
      posts: { name: 'posts', label: 'Posts', hide: false, create: true },
    },
    entries: { entities: {} },
    globalUI: { isFetching: false },
    mediaLibrary: { externalLibrary: false, showMediaButton: true },
    ...overrides,
  };
}

function renderAppContentAt(
  path: string,
  props: Parameters<typeof AppContent>[0] = {},
  state = baseState(),
) {
  const decapValue = {
    config: state.config,
    theme: {},
    routing: defaultRoutingTable,
    router: {} as any,
    navigate: vi.fn(),
    params: vi.fn(),
    path,
  };

  return {
    ...render(
      <Provider store={mockStore(state)}>
        <context.Provider value={decapValue}>
          <AppContent {...props} />
        </context.Provider>
      </Provider>,
    ),
    // Exposed so DCMS-432 regression tests can assert no navigation (and
    // therefore no URL/hash rewrite) happened for an unknown collection.
    navigate: decapValue.navigate,
  };
}

describe('AppContent - DCMS-431 editor-route header suppression', () => {
  it('mounts the app-shell header on a collection route', () => {
    const { getByTestId, queryByTestId } = renderAppContentAt('/collections/posts');

    expect(getByTestId('app-header')).toBeInTheDocument();
    expect(getByTestId('collection-view')).toBeInTheDocument();
    expect(queryByTestId('editor-view')).not.toBeInTheDocument();
  });

  it('does not mount the app-shell header for a new-entry editor route', () => {
    const { getByTestId, queryByTestId } = renderAppContentAt('/collections/posts/new');

    expect(getByTestId('editor-view')).toBeInTheDocument();
    expect(queryByTestId('app-header')).not.toBeInTheDocument();
  });

  it('does not mount the app-shell header for an existing-entry editor route', () => {
    const { getByTestId, queryByTestId } = renderAppContentAt(
      '/collections/posts/entries/2026-07-09-hello',
    );

    expect(getByTestId('editor-view')).toBeInTheDocument();
    expect(queryByTestId('app-header')).not.toBeInTheDocument();
  });

  it('never renders a custom header (renderHeader) on an editor route either', () => {
    const customHeader = vi.fn(() => <div data-testid="custom-header" />);
    const { queryByTestId } = renderAppContentAt('/collections/posts/new', {
      renderHeader: customHeader,
    });

    expect(queryByTestId('custom-header')).not.toBeInTheDocument();
    expect(customHeader).not.toHaveBeenCalled();
  });

  it('passes isEditorRoute through to a custom renderLayout', () => {
    const seen: boolean[] = [];
    const renderLayout = (renderProps: AppLayoutRenderProps) => {
      seen.push(renderProps.isEditorRoute);
      return <div data-testid="layout">{renderProps.main}</div>;
    };

    renderAppContentAt('/collections/posts', { renderLayout });
    renderAppContentAt('/collections/posts/new', { renderLayout });

    expect(seen).toEqual([false, true]);
  });
});

describe('AppContent - DCMS-445 failed entry-load restores app chrome', () => {
  it('mounts the app-shell header for an existing-entry route whose entry failed to load', () => {
    const state = baseState({
      entries: { entities: { 'posts.does-not-exist': { error: 'Entry not found: nope.md' } } },
    });
    const { getByTestId, queryByTestId } = renderAppContentAt(
      '/collections/posts/entries/does-not-exist',
      {},
      state,
    );

    expect(getByTestId('app-header')).toBeInTheDocument();
    expect(getByTestId('editor-view')).toBeInTheDocument();
  });

  it('reports isEditorRoute: false to a custom renderLayout when the entry failed to load', () => {
    const seen: boolean[] = [];
    const renderLayout = (renderProps: AppLayoutRenderProps) => {
      seen.push(renderProps.isEditorRoute);
      return <div data-testid="layout">{renderProps.main}</div>;
    };
    const state = baseState({
      entries: { entities: { 'posts.does-not-exist': { error: 'Entry not found: nope.md' } } },
    });

    renderAppContentAt('/collections/posts/entries/does-not-exist', { renderLayout }, state);

    expect(seen).toEqual([false]);
  });

  it('still suppresses the app-shell header for an entry route still loading (no error yet)', () => {
    const { getByTestId, queryByTestId } = renderAppContentAt(
      '/collections/posts/entries/still-loading',
    );

    expect(getByTestId('editor-view')).toBeInTheDocument();
    expect(queryByTestId('app-header')).not.toBeInTheDocument();
  });
});

describe('AppContent - DCMS-432 unknown-collection deep-link', () => {
  it('renders NotFound naming the missing collection instead of the collection view, for a bare collection route', () => {
    const { getByText, queryByTestId } = renderAppContentAt(
      '/collections/nonexistent_collection',
    );

    expect(getByText('app.notFoundPage.header')).toBeInTheDocument();
    expect(getByText('app.notFoundPage.collectionNotFound')).toBeInTheDocument();
    expect(queryByTestId('collection-view')).not.toBeInTheDocument();
  });

  it('renders NotFound naming the missing collection for an entry deep-link too, instead of the editor view', () => {
    const { getByText, queryByTestId } = renderAppContentAt(
      '/collections/nonexistent_collection/entries/foo',
    );

    expect(getByText('app.notFoundPage.header')).toBeInTheDocument();
    expect(getByText('app.notFoundPage.collectionNotFound')).toBeInTheDocument();
    expect(queryByTestId('editor-view')).not.toBeInTheDocument();
  });

  it('does not navigate away (no URL/hash rewrite) when the collection is unknown', () => {
    const { navigate } = renderAppContentAt('/collections/nonexistent_collection');

    // Previously this fell through to `navigate('collection', { collectionName:
    // <first collection> }, { replace: true })`, silently rewriting the URL
    // bar to the default collection. It must now stay on the bad deep-link.
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate away for an unknown-collection entry deep-link either', () => {
    const { navigate } = renderAppContentAt('/collections/nonexistent_collection/entries/foo');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('still renders the collection view for a known collection (no regression)', () => {
    const { getByTestId, queryByText } = renderAppContentAt('/collections/posts');

    expect(getByTestId('collection-view')).toBeInTheDocument();
    expect(queryByText('app.notFoundPage.header')).not.toBeInTheDocument();
  });

  it('honours a custom renderNotFound for an unknown collection', () => {
    const renderNotFound = vi.fn(() => <div data-testid="custom-not-found" />);
    const { getByTestId, queryByText } = renderAppContentAt(
      '/collections/nonexistent_collection',
      { renderNotFound },
    );

    expect(getByTestId('custom-not-found')).toBeInTheDocument();
    expect(queryByText('app.notFoundPage.header')).not.toBeInTheDocument();
  });
});

describe('AppContent - DCMS-578 /media deep-link', () => {
  it('does not render NotFound for the /media route', () => {
    const { queryByText } = renderAppContentAt('/media');

    expect(queryByText('app.notFoundPage.header')).not.toBeInTheDocument();
  });

  it('redirects to the default collection', () => {
    const { navigate } = renderAppContentAt('/media');

    expect(navigate).toHaveBeenCalledWith(
      'collection',
      { collectionName: 'posts' },
      { replace: true },
    );
  });

  it('dispatches openMediaLibrary so the modal opens on top of the redirected view', () => {
    const state = baseState();
    const store = mockStore(state);
    const decapValue = {
      config: state.config,
      theme: {},
      routing: defaultRoutingTable,
      router: {} as any,
      navigate: vi.fn(),
      params: vi.fn(),
      path: '/media',
    };

    render(
      <Provider store={store}>
        <context.Provider value={decapValue}>
          <AppContent />
        </context.Provider>
      </Provider>,
    );

    expect(store.getActions().some(action => action.type === 'MEDIA_LIBRARY_OPEN')).toBe(true);
  });
});
