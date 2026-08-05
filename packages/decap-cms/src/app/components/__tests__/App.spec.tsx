import { act, render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';

// Pass-through translate/useTranslate so `AppContent` doesn't need a real
// `@/core/i18n` `<I18n>` ancestor.
vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => (props: any) => (
    <Component
      {...props}
      t={(key: string) => key}
    />
  ),
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

// AppContent mounts an onSessionExpired subscription via currentBackend()
// (added in 85416b22, DCMS silent token refresh). resolveBackend throws when
// no backend named `test-repo` is registered — which is intentional at runtime
// but noise here, since this spec mostly exercises routing/header behaviour
// and never authenticates. Stub currentBackend to a subscription that records
// its listeners, so the session-expiry specs below can fire the event.
const sessionExpiredListeners = vi.hoisted(() => [] as Array<() => void>);
vi.mock('@/core/backend', () => ({
  currentBackend: () => ({
    onSessionExpired: (listener: () => void) => {
      sessionExpiredListeners.push(listener);
      return () => {};
    },
    authComponent: () => null,
  }),
}));

import { AppContent } from '@/app/components/App';
import { context } from '@/core/contexts/decap';
import { defaultRoutingTable } from '@/core/routing/router';
import { RouterProvider as InAppRouterProvider } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';

import type { AppLayoutRenderProps } from '@/app/components/App';
import type * as UIModule from '@/core/components/UI';

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
          {/*
            The not-found page's "Back to home" link (DCMS-1837, like the
            DCMS-445 entry-not-found link before it) renders via the in-house
            `<Link>`, which reads `@/core/routing/context`'s `RouterProvider`
            — a *different* context than the `decap` one stubbed above. In the
            real app `DecapCmsProvider` supplies it; here we give it its own
            router purely so `<Link>` doesn't throw. Route matching itself
            still runs off `decapValue.path`, not this router's location, so
            it doesn't affect which page renders.
          */}
          <InAppRouterProvider router={createDefaultRouter()}>
            <AppContent {...props} />
          </InAppRouterProvider>
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

  it('renders a "Back to home" link on the not-found page for an unknown collection (DCMS-1837)', () => {
    const { getByRole } = renderAppContentAt('/collections/nonexistent_collection');

    const link = getByRole('link', { name: 'app.notFoundPage.backToHome' });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('#/');
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

describe('AppContent - session-expired re-auth overlay', () => {
  it('keeps the app mounted and renders a blocking overlay when the session expired', () => {
    const state = baseState({
      auth: {
        user: { name: 'Alice', login: 'alice' },
        isFetching: false,
        error: null,
        sessionExpired: true,
      },
    });
    const { getByRole, getByTestId } = renderAppContentAt('/collections/posts', {}, state);

    // The routed app is still there (an open editor would keep its draft)...
    expect(getByTestId('collection-view')).toBeInTheDocument();
    // ...with the re-auth dialog blocking it.
    expect(getByRole('dialog', { name: 'app.app.sessionExpiredTitle' })).toBeInTheDocument();
  });

  it('renders no overlay while the session is healthy', () => {
    const { queryByRole } = renderAppContentAt('/collections/posts');

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('passes sessionExpired to a custom renderAuth inside the overlay', () => {
    const renderAuth = vi.fn(() => <div data-testid="custom-auth" />);
    const state = baseState({
      auth: {
        user: { name: 'Alice', login: 'alice' },
        isFetching: false,
        error: null,
        sessionExpired: true,
      },
    });
    const { getByTestId } = renderAppContentAt('/collections/posts', { renderAuth }, state);

    expect(getByTestId('custom-auth')).toBeInTheDocument();
    expect(renderAuth).toHaveBeenCalledWith(expect.objectContaining({ sessionExpired: true }));
  });

  it('dispatches auth/sessionExpired (not a logout) when the backend reports expiry', () => {
    const state = baseState();
    const store = mockStore(state);
    const decapValue = {
      config: state.config,
      theme: {},
      routing: defaultRoutingTable,
      router: {} as any,
      navigate: vi.fn(),
      params: vi.fn(),
      path: '/collections/posts',
    };
    sessionExpiredListeners.length = 0;

    render(
      <Provider store={store}>
        <context.Provider value={decapValue}>
          <AppContent />
        </context.Provider>
      </Provider>,
    );

    expect(sessionExpiredListeners.length).toBeGreaterThan(0);
    act(() => {
      for (const listener of sessionExpiredListeners) listener();
    });

    const types = store.getActions().map(action => action.type);
    expect(types).toContain('auth/sessionExpired');
    expect(types.some(type => String(type).startsWith('auth/logoutUser'))).toBe(false);
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
