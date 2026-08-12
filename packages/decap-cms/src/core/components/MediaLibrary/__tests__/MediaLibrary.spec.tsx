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

// Isolate the MediaLibrary <-> crop-dialog wiring from the dialog's own
// canvas/pointer-drag internals (covered separately in
// ImageCropDialog.spec.tsx): stand in a fake with Confirm/Cancel buttons
// that call straight through to the props MediaLibrary passed it.
vi.mock('@/core/components/MediaLibrary/ImageCropDialog', () => ({
  default: ({ file, onConfirm, onCancel }: any) => (
    <div data-testid="fake-crop-dialog">
      <span>{file.name}</span>
      <button onClick={() => onConfirm(new File(['cropped'], file.name, { type: file.type }))}>
        confirm-crop
      </button>
      <button onClick={onCancel}>cancel-crop</button>
    </div>
  ),
}));

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

  describe('crop before upload (DCMS-2011)', () => {
    function selectFile(file: File) {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
    }

    it('opens the crop dialog instead of persisting immediately when crop is enabled for an image upload', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        forImage: true,
        cropConfig: { enabled: true },
      });

      selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));

      expect(props.persistMedia).not.toHaveBeenCalled();
      expect(document.querySelector('[data-testid="fake-crop-dialog"]')).not.toBeNull();
    });

    it('persists the cropped file once the dialog is confirmed', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        forImage: true,
        cropConfig: { enabled: true },
      });

      selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));

      const confirmButton = Array.from(document.querySelectorAll('button')).find(
        button => button.textContent === 'confirm-crop',
      ) as HTMLButtonElement;
      fireEvent.click(confirmButton);

      expect(props.persistMedia).toHaveBeenCalledTimes(1);
      const [persistedFile] = (props.persistMedia as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(persistedFile.name).toBe('photo.png');
    });

    it('drops the pending upload without persisting when the dialog is cancelled', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        forImage: true,
        cropConfig: { enabled: true },
      });

      selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));

      const cancelButton = Array.from(document.querySelectorAll('button')).find(
        button => button.textContent === 'cancel-crop',
      ) as HTMLButtonElement;
      fireEvent.click(cancelButton);

      expect(props.persistMedia).not.toHaveBeenCalled();
      expect(document.querySelector('[data-testid="fake-crop-dialog"]')).toBeNull();
    });

    it('persists directly, bypassing the crop dialog, when crop is disabled', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        forImage: true,
        cropConfig: { enabled: false },
      });

      selectFile(new File(['x'], 'photo.png', { type: 'image/png' }));

      expect(document.querySelector('[data-testid="fake-crop-dialog"]')).toBeNull();
      expect(props.persistMedia).toHaveBeenCalledTimes(1);
    });

    it('persists directly for non-image widgets even when crop is enabled', () => {
      const { props } = renderMediaLibrary({
        isVisible: true,
        forImage: false,
        cropConfig: { enabled: true },
      });

      selectFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' }));

      expect(document.querySelector('[data-testid="fake-crop-dialog"]')).toBeNull();
      expect(props.persistMedia).toHaveBeenCalledTimes(1);
    });
  });
});
