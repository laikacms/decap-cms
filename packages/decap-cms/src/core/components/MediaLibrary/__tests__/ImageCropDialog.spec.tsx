import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
  translate: () => (Component: React.ComponentType<any>) => (props: any) => (
    <Component
      {...props}
      t={(key: string) => key}
    />
  ),
}));

import ImageCropDialog from '@/core/components/MediaLibrary/ImageCropDialog';

const t = (key: string) => key;

function stubBitmap(width: number, height: number) {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close: vi.fn() }));
}

function stubObjectUrl() {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
}

describe('ImageCropDialog', () => {
  beforeEach(() => {
    stubObjectUrl();
    if (!document.getElementById('nc-root')) {
      const root = document.createElement('div');
      root.id = 'nc-root';
      document.body.appendChild(root);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('cancels without cropping when Cancel is clicked', async () => {
    stubBitmap(800, 600);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    render(<ImageCropDialog file={file} onConfirm={onConfirm} onCancel={onCancel} t={t} />);

    fireEvent.click(screen.getByText('mediaLibrary.cropDialog.cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('crops the full image by default and calls onConfirm with a File', async () => {
    stubBitmap(800, 600);
    const outputBlob = new Blob(['cropped'], { type: 'image/png' });
    const convertToBlob = vi.fn().mockResolvedValue(outputBlob);
    class FakeOffscreenCanvas {
      constructor(public width: number, public height: number) {}
      getContext() {
        return { drawImage: vi.fn() };
      }
      convertToBlob = convertToBlob;
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    const onConfirm = vi.fn();
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    render(<ImageCropDialog file={file} onConfirm={onConfirm} onCancel={vi.fn()} t={t} />);

    const confirmButton = await screen.findByText('mediaLibrary.cropDialog.confirm');
    await waitFor(() => expect(confirmButton).not.toBeDisabled());

    fireEvent.click(confirmButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const [result] = onConfirm.mock.calls[0];
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.png');
  });

  it('shows a load error and disables Confirm when the image cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    render(<ImageCropDialog file={file} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />);

    await screen.findByText('mediaLibrary.cropDialog.loadError');
    expect(screen.getByText('mediaLibrary.cropDialog.confirm')).toBeDisabled();
  });

  it('constrains the initial selection to the given aspect ratio', async () => {
    stubBitmap(800, 600);
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    render(<ImageCropDialog file={file} aspectRatio={1} onConfirm={vi.fn()} onCancel={vi.fn()} t={t} />);

    const selection = await screen.findByTestId('crop-selection');
    // Display is scaled down from 800x600 to fit the 600x420 stage:
    // scale = min(1, 600/800, 420/600) = 0.7. A square crop centered in an
    // 800x600 source is 600x600 source px -> 420x420 display px.
    await waitFor(() => {
      expect(getComputedStyle(selection).width).toBe('420px');
      expect(getComputedStyle(selection).height).toBe('420px');
    });
  });
});
