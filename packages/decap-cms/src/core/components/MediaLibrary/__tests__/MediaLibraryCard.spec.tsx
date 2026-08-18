import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryCard, { formatFileSize } from '@/core/components/MediaLibrary/MediaLibraryCard';

describe('MediaLibraryCard', () => {
  const props = {
    displayURL: { url: 'url' },
    text: 'image.png',
    onClick: vi.fn(),
    draftText: 'Draft',
    width: '100px',
    height: '240px',
    margin: '10px',
    isViewableImage: true,
    loadDisplayURL: vi.fn(),
  };

  it('should not render draft text for non draft image', () => {
    const { queryByTestId } = render(<MediaLibraryCard {...props} />);

    expect(queryByTestId('draft-text')).toBeNull();
  });

  it('should render draft text for draft image', () => {
    const { getByTestId } = render(<MediaLibraryCard {...props} isDraft={true} />);
    expect(getByTestId('draft-text')).toHaveTextContent('Draft');
  });

  it('should render file icon for non viewable image', () => {
    const { getByTestId } = render(
      <MediaLibraryCard {...props} isViewableImage={false} type="Not Viewable" />,
    );
    expect(getByTestId('card-file-icon')).toHaveTextContent('Not Viewable');
  });

  it('should call loadDisplayURL on mount when url is empty', () => {
    const loadDisplayURL = vi.fn();
    render(
      <MediaLibraryCard {...props} loadDisplayURL={loadDisplayURL} displayURL={{ url: '' }} />,
    );

    expect(loadDisplayURL).toHaveBeenCalledTimes(1);
  });

  it('should render the image with an accessible alt attribute set to the filename', () => {
    const { container } = render(<MediaLibraryCard {...props} />);
    const img = container.querySelector('img.CardImage');

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', props.text);
  });

  // DCMS-2174: the card renders asset weight so bloated uploads (e.g. a
  // 30 MB placeholder) are visually distinguishable from KB-scale assets.
  describe('file size (DCMS-2174)', () => {
    it('renders a human-readable size for a File with a known size', () => {
      const file = new File(['a'.repeat(1000)], 'photo.png', { type: 'image/png' });
      const { getByTestId } = render(<MediaLibraryCard {...props} size={file.size} />);

      expect(getByTestId('card-file-size')).toHaveTextContent('1 KB');
    });

    it('renders a megabyte-scale size with one decimal place', () => {
      const thirtyMb = 30 * 1000 * 1000;
      const { getByTestId } = render(<MediaLibraryCard {...props} size={thirtyMb} />);

      expect(getByTestId('card-file-size')).toHaveTextContent('30.0 MB');
    });

    it('renders nothing when size is unknown', () => {
      const { queryByTestId } = render(<MediaLibraryCard {...props} size={undefined} />);

      expect(queryByTestId('card-file-size')).toBeNull();
    });
  });
});

describe('formatFileSize', () => {
  it('formats bytes under 1000 as B', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobyte-scale sizes as a whole number', () => {
    expect(formatFileSize(92_000)).toBe('92 KB');
  });

  it('formats megabyte-scale sizes with one decimal place', () => {
    expect(formatFileSize(30_000_000)).toBe('30.0 MB');
  });

  it('returns undefined for an unknown size', () => {
    expect(formatFileSize(undefined)).toBeUndefined();
  });
});
