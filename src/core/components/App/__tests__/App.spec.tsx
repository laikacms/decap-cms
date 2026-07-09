import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { describe, expect, it, vi } from 'vitest';


// Pass-through translate/useTranslate so `AppContent` doesn't need a real
// `react-polyglot` `<I18n>` ancestor.
vi.mock('react-polyglot', () => ({
  useTranslate: () => (key: string) => key,
  translate:
    () =>
    (Component: React.ComponentType<any>) =>
    (props: any) => <Component {...props} t={(key: string) => key} />,
}));

// Stub the heavy page components — this spec only cares about which of the
// app-shell header / routed page mounts for a given route, not their guts.
vi.mock('../Header', () => ({
  default: () => <header data-testid="app-header">App Header</header>,
}));
vi.mock('../../Collection/Collection', () => ({
  default: () => <div data-testid="collection-view" />,
}));
vi.mock('../../Workflow/Workflow', () => ({
  default: () => <div data-testid="workflow-view" />,
}));
vi.mock('../../Editor/Editor', () => ({
  default: () => <div data-testid="editor-view" />,
}));
vi.mock('../../MediaLibrary/MediaLibrary', () => ({
  default: () => <div data-testid="media-library" />,
}));
vi.mock('../../UI', async () => {
  const actual = await vi.importActual<UIModule>('../../UI');
  return {
    ...actual,
    Notifications: () => null,
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { AppContent } from '../App';
import { context } from '../../../contexts/decap';
import { defaultRoutingTable } from '../../../routing/router';

import type * as UIModule from '../../UI';
import type { AppLayoutRenderProps } from '../App';

const mockStore = configureStore([]);

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    auth: { user: { name: 'Alice', login: 'alice' }, isFetching: false, error: null },
    config: { isFetching: false, error: null, backend: { name: 'test-repo' } },
    collections: {
      posts: { name: 'posts', label: 'Posts', hide: false, create: true },
    },
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

  return render(
    <Provider store={mockStore(state)}>
      <context.Provider value={decapValue}>
        <AppContent {...props} />
      </context.Provider>
    </Provider>,
  );
}

describe('AppContent — DCMS-431 editor-route header suppression', () => {
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
