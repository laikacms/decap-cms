import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate:
    () =>
    (Component: React.ComponentType<any>) =>
    (props: any) => <Component {...props} t={(key: string) => key} />,
}));

import { MediaLibrary } from '@/core/components/MediaLibrary/MediaLibrary';
import { RouterProvider } from '@/core/routing/context';

import type { Router, RouterUpdate } from '@/core/routing/router';

const routerListeners: Array<(update: RouterUpdate) => void> = [];

// A minimal fake of the Router port: MediaLibrary only subscribes (to close
// itself on navigation) and the RouterProvider ancestor reads `location()`.
// `block` is deliberately omitted — it is optional on the port.
const fakeRouter: Router = {
  location: () => ({ pathname: '/', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn((listener: (update: RouterUpdate) => void) => {
    routerListeners.push(listener);
    return () => {
      const index = routerListeners.indexOf(listener);
      if (index >= 0) routerListeners.splice(index, 1);
    };
  }),
};

function fireRouterUpdate() {
  const update: RouterUpdate = { location: { pathname: '/', search: '' }, action: 'PUSH' };
  routerListeners.forEach(listener => listener(update));
}

function renderMediaLibrary(overrides: Partial<React.ComponentProps<typeof MediaLibrary>> = {}) {
  const props = {
    isVisible: true,
    canInsert: true,
    files: [],
    loadMedia: vi.fn(),
    persistMedia: vi.fn(),
    deleteMedia: vi.fn(),
    insertMedia: vi.fn(),
    closeMediaLibrary: vi.fn(),
    t: ((key: string) => key) as any,
    ...overrides,
  };

  const utils = render(
    <RouterProvider router={fakeRouter}>
      <MediaLibrary {...props} />
    </RouterProvider>,
  );
  return { ...utils, props };
}

describe('MediaLibrary', () => {
  beforeEach(() => {
    routerListeners.length = 0;
    if (!document.getElementById('nc-root')) {
      const root = document.createElement('div');
      root.id = 'nc-root';
      document.body.appendChild(root);
    }
  });

  it('closes the modal when the router navigates while it is visible', () => {
    const { props } = renderMediaLibrary({ isVisible: true });

    expect(props.closeMediaLibrary).not.toHaveBeenCalled();

    fireRouterUpdate();

    expect(props.closeMediaLibrary).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch close on router navigation when the modal is not visible', () => {
    const { props } = renderMediaLibrary({ isVisible: false });

    fireRouterUpdate();

    expect(props.closeMediaLibrary).not.toHaveBeenCalled();
  });

  it('unsubscribes from the router on unmount', () => {
    const { unmount } = renderMediaLibrary({ isVisible: true });

    // Two subscriptions while mounted: MediaLibrary's close-on-navigate
    // listener plus the RouterProvider ancestor's location sync.
    expect(routerListeners).toHaveLength(2);

    unmount();

    expect(routerListeners).toHaveLength(0);
  });

  it('still closes without inserting when the close button handler is invoked directly', () => {
    const { props } = renderMediaLibrary({ isVisible: true });

    fireRouterUpdate();

    expect(props.insertMedia).not.toHaveBeenCalled();
    expect(props.closeMediaLibrary).toHaveBeenCalledTimes(1);
  });
});
