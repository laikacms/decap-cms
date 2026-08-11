import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyToClipBoardButton } from '@/core/components/MediaLibrary/MediaLibraryButtons';

describe('CopyToClipBoardButton', () => {
  const props = {
    disabled: false,
    t: vi.fn(key => key),
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should use copy text when no path is defined', () => {
    const { container } = render(<CopyToClipBoardButton {...props} />);

    expect(container).toHaveTextContent('mediaLibrary.mediaLibraryCard.copy');
  });

  it('should use copyUrl text when path is absolute and is draft', () => {
    const { container } = render(
      <CopyToClipBoardButton {...props} path="https://www.images.com/image.png" draft />,
    );

    expect(container).toHaveTextContent('mediaLibrary.mediaLibraryCard.copyUrl');
  });

  it('should use copyUrl text when path is absolute and is not draft', () => {
    const { container } = render(
      <CopyToClipBoardButton {...props} path="https://www.images.com/image.png" />,
    );

    expect(container).toHaveTextContent('mediaLibrary.mediaLibraryCard.copyUrl');
  });

  it('should use copyName when path is not absolute and is draft', () => {
    const { container } = render(<CopyToClipBoardButton {...props} path="image.png" draft />);

    expect(container).toHaveTextContent('mediaLibrary.mediaLibraryCard.copyName');
  });

  it('should use copyPath when path is not absolute and is not draft', () => {
    const { container } = render(<CopyToClipBoardButton {...props} path="image.png" />);

    expect(container).toHaveTextContent('mediaLibrary.mediaLibraryCard.copyPath');
  });

  describe('clicking the button copies a single auto-picked value (no per-target choice)', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      writeText.mockClear();
      vi.stubGlobal('navigator', { clipboard: { writeText } });
    });

    it('copies the absolute URL when the path resolves to one', async () => {
      const { container } = render(
        <CopyToClipBoardButton
          {...props}
          path="https://www.images.com/image.png"
          name="image.png"
          draft
        />,
      );

      fireEvent.click(container.querySelector('button')!);

      expect(writeText).toHaveBeenCalledWith('https://www.images.com/image.png');
    });

    it('copies the filename (not the path) for a draft entry when the path is relative', async () => {
      const { container } = render(
        <CopyToClipBoardButton {...props} path="static/media/image.png" name="image.png" draft />,
      );

      fireEvent.click(container.querySelector('button')!);

      expect(writeText).toHaveBeenCalledWith('image.png');
    });

    it('copies the repo path (not the filename) for a non-draft entry when the path is relative', () => {
      const { container } = render(
        <CopyToClipBoardButton {...props} path="static/media/image.png" name="image.png" />,
      );

      fireEvent.click(container.querySelector('button')!);

      expect(writeText).toHaveBeenCalledWith('static/media/image.png');
    });
  });
});
