import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryCard from '@/core/components/MediaLibrary/MediaLibraryCard';

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
});
