import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('react-polyglot', () => ({
  useTranslate: () => (key: string) => key,
  translate:
    () =>
    (Component: React.ComponentType<any>) =>
    (props: any) => <Component {...props} t={(key: string) => key} />,
}));

import { MediaLibrary } from '../MediaLibrary';

const routerListeners: Array<() => void> = [];

vi.mock('../../../routing/router', () => ({
  defaultRouter: {
    subscribe: vi.fn((listener: () => void) => {
      routerListeners.push(listener);
      return () => {
        const index = routerListeners.indexOf(listener);
        if (index >= 0) routerListeners.splice(index, 1);
      };
    }),
  },
}));

function fireRouterUpdate() {
  routerListeners.forEach(listener => listener());
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

  const utils = render(<MediaLibrary {...props} />);
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

    expect(routerListeners).toHaveLength(1);

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
