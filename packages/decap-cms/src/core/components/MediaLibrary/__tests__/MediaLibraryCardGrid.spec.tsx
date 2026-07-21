import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryCardGrid from '@/core/components/MediaLibrary/MediaLibraryCardGrid';

vi.mock('@/ui/hooks/useElementSize', () => ({
  useElementSize: () => ({ width: 600, height: 400 }),
}));

describe('MediaLibraryCardGrid', () => {
  const props = {
    setScrollContainerRef: vi.fn(),
    mediaItems: [
      { id: '1', key: '1', name: 'moby-dick.jpg', type: 'image', isViewableImage: true },
    ],
    isSelectedFile: vi.fn(() => false),
    onAssetClick: vi.fn(),
    onLoadMore: vi.fn(),
    cardDraftText: 'Draft',
    cardWidth: '100px',
    cardHeight: '100px',
    cardMargin: '10px',
    loadDisplayURL: vi.fn(),
    displayURLs: {},
  };

  it('spreads ariaAttributes onto grid cells so they expose role=gridcell and aria-colindex', () => {
    const { container } = render(<MediaLibraryCardGrid {...props} />);

    const gridCells = container.querySelectorAll('[role="gridcell"]');
    expect(gridCells.length).toBeGreaterThan(0);
    expect(gridCells[0]).toHaveAttribute('aria-colindex');
  });

  it('gives the grid an accessible name', () => {
    const { container } = render(<MediaLibraryCardGrid {...props} />);

    const grid = container.querySelector('[role="grid"]');
    expect(grid).toHaveAttribute('aria-label', 'Media assets');
  });
});
