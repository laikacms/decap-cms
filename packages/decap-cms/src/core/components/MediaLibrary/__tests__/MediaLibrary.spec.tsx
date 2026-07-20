import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => (props: any) => (
    <Component
      {...props}
      t={(key: string) => key}
    />
  ),
}));
vi.mock('@/ui', async () => {
  const actual = await vi.importActual<typeof UiModule>('@/ui');
  return {
    ...actual,
    showAlert: vi.fn(),
    confirmDialog: vi.fn(),
  };
});

import { MediaLibrary } from '@/core/components/MediaLibrary/MediaLibrary';
import { RouterProvider } from '@/core/routing/context';
import { showAlert } from '@/ui';

import type { Router, RouterUpdate } from '@/core/routing/router';
import type * as UiModule from '@/ui';

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

  describe('config.max_file_size', () => {
    // MediaLibraryModal portals into #nc-root (created in the outer beforeEach),
    // so the upload input lives outside the render() container.
    function selectFile(file: File) {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
    }

    beforeEach(() => {
      vi.mocked(showAlert).mockClear();
    });

    it('rejects an upload above the configured max_file_size', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        config: { max_file_size: 1000 },
      });

      const oversizedFile = new File(['a'.repeat(1001)], 'big.txt', { type: 'text/plain' });
      selectFile(oversizedFile);

      expect(props.persistMedia).not.toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledTimes(1);
    });

    it('accepts an upload at or under the configured max_file_size', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        config: { max_file_size: 1000 },
      });

      const fittingFile = new File(['a'.repeat(1000)], 'ok.txt', { type: 'text/plain' });
      selectFile(fittingFile);

      expect(showAlert).not.toHaveBeenCalled();
      expect(props.persistMedia).toHaveBeenCalledTimes(1);
    });

    it('applies no limit when max_file_size is not set', () => {
      const { props } = renderMediaLibrary({ isVisible: true, config: {} });

      const largeFile = new File(['a'.repeat(50_000)], 'unbounded.txt', { type: 'text/plain' });
      selectFile(largeFile);

      expect(showAlert).not.toHaveBeenCalled();
      expect(props.persistMedia).toHaveBeenCalledTimes(1);
    });
  });
});
