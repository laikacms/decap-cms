/**
 * Unit tests for the image widget's ImagePreview component (DCMS-1351).
 *
 * ImagePreview had zero test coverage. These tests lock down its branches:
 * falsy value renders no `<img>`, a string value resolves `src` via
 * `getAsset`, a `File` value resolves `src` via `URL.createObjectURL` and
 * revokes the object URL on unmount/value change, and an array value renders
 * one image per entry. `src` is resolved in a `useEffect` (DCMS-1036), so
 * assertions run after the effect has flushed.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ImagePreview from '@/widgets/image/ImagePreview';

describe('ImagePreview (image)', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLSpy = vi.fn((file: File) => `blob:${file.name}`);
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders no <img> when value is falsy', async () => {
    const getAsset = vi.fn();

    const { container } = render(
      React.createElement(ImagePreview, { value: undefined, getAsset }),
    );

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(0);
    });
    expect(getAsset).not.toHaveBeenCalled();
  });

  it('resolves src via getAsset for a string value', async () => {
    const getAsset = vi.fn((value: string) => `https://cdn.example.com/${value}`);

    const { container } = render(
      React.createElement(ImagePreview, { value: 'photo.png', getAsset }),
    );

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('https://cdn.example.com/photo.png');
    });
    expect(getAsset).toHaveBeenCalledWith('photo.png', undefined);
  });

  it('resolves src via URL.createObjectURL for a File value and revokes it on unmount', async () => {
    const getAsset = vi.fn();
    const file = new File(['content'], 'upload.png', { type: 'image/png' });

    const { container, unmount } = render(
      React.createElement(ImagePreview, { value: file, getAsset }),
    );

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('blob:upload.png');
    });
    expect(createObjectURLSpy).toHaveBeenCalledWith(file);
    expect(getAsset).not.toHaveBeenCalled();

    unmount();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:upload.png');
  });

  it('revokes the previous object URL when the File value changes', async () => {
    const getAsset = vi.fn();
    const firstFile = new File(['a'], 'first.png', { type: 'image/png' });
    const secondFile = new File(['b'], 'second.png', { type: 'image/png' });

    const { container, rerender } = render(
      React.createElement(ImagePreview, { value: firstFile, getAsset }),
    );

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('blob:first.png');
    });

    rerender(React.createElement(ImagePreview, { value: secondFile, getAsset }));

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('blob:second.png');
    });
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:first.png');
  });

  it('renders one image per entry for an array value', async () => {
    const getAsset = vi.fn((value: string) => `https://cdn.example.com/${value}`);
    const value = ['a.png', 'b.png', 'c.png'];

    const { container } = render(React.createElement(ImagePreview, { value, getAsset }));

    await waitFor(() => {
      const imgs = container.querySelectorAll('img');
      expect(imgs).toHaveLength(value.length);
      value.forEach((path, index) => {
        expect(imgs[index].getAttribute('src')).toBe(`https://cdn.example.com/${path}`);
      });
    });
  });
});
