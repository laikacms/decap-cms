import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import MediaLibraryCardGrid from '@/core/components/MediaLibrary/MediaLibraryCardGrid';

vi.mock('@/ui/hooks/useElementSize', () => ({
  // Wide enough that every test item fits on a single row (single-row
  // navigation keeps the keyboard-contract assertions below simple).
  useElementSize: () => ({ width: 1200, height: 400 }),
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

  const multiItemProps = {
    ...props,
    mediaItems: [
      { id: '1', key: '1', name: 'nf-logo.png', type: 'image', isViewableImage: true },
      { id: '2', key: '2', name: 'lobby.jpg', type: 'image', isViewableImage: true },
      { id: '3', key: '3', name: 'moby-dick.jpg', type: 'image', isViewableImage: true },
    ],
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

  it('only gives one cell tabindex=0 (roving tabindex), the rest -1', () => {
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} />);

    const cells = Array.from(container.querySelectorAll('[role="gridcell"]'));
    expect(cells).toHaveLength(3);
    const tabbable = cells.filter(cell => cell.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute('data-cell-index', '0');
    expect(cells.filter(cell => cell.getAttribute('tabindex') === '-1')).toHaveLength(2);
  });

  it('moves the roving tabindex marker with ArrowRight/ArrowLeft', () => {
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cell0 = container.querySelector('[data-cell-index="0"]') as HTMLElement;
    cell0.focus();

    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(container.querySelector('[data-cell-index="1"]')).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('[data-cell-index="1"]')).toHaveAttribute('tabindex', '-1');
  });

  it('clamps ArrowLeft/ArrowRight at the row edges instead of wrapping past them', () => {
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cell0 = container.querySelector('[data-cell-index="0"]') as HTMLElement;
    cell0.focus();

    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(grid, { key: 'End' });
    expect(container.querySelector('[data-cell-index="2"]')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(container.querySelector('[data-cell-index="2"]')).toHaveAttribute('tabindex', '0');
  });

  it('Home/End move to the first/last cell', () => {
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cell0 = container.querySelector('[data-cell-index="0"]') as HTMLElement;
    cell0.focus();

    fireEvent.keyDown(grid, { key: 'End' });
    expect(container.querySelector('[data-cell-index="2"]')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(grid, { key: 'Home' });
    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute('tabindex', '0');
  });

  it('Enter and Space activate the focused cell the same way a click on it would', () => {
    const onAssetClick = vi.fn();
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} onAssetClick={onAssetClick} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cell1 = container.querySelector('[data-cell-index="1"]') as HTMLElement;
    fireEvent.focus(cell1);

    fireEvent.keyDown(grid, { key: 'Enter' });
    expect(onAssetClick).toHaveBeenCalledTimes(1);
    expect(onAssetClick).toHaveBeenCalledWith(multiItemProps.mediaItems[1]);

    fireEvent.keyDown(grid, { key: ' ' });
    expect(onAssetClick).toHaveBeenCalledTimes(2);
    expect(onAssetClick).toHaveBeenCalledWith(multiItemProps.mediaItems[1]);
  });

  it('keeps the existing mouse click-to-select behavior working unchanged', () => {
    const onAssetClick = vi.fn();
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} onAssetClick={onAssetClick} />);

    const cell2 = container.querySelector('[data-cell-index="2"]') as HTMLElement;
    fireEvent.click(cell2.querySelector('*') as HTMLElement);

    expect(onAssetClick).toHaveBeenCalledWith(multiItemProps.mediaItems[2]);
  });

  it('sets aria-selected="true" on the gridcell for the selected file and "false" for the rest', () => {
    const isSelectedFile = vi.fn((file: { key: string }) => file.key === '2');
    const { container } = render(
      <MediaLibraryCardGrid {...multiItemProps} isSelectedFile={isSelectedFile} />,
    );

    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(container.querySelector('[data-cell-index="1"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(container.querySelector('[data-cell-index="2"]')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('toggles aria-selected as isSelectedFile changes for the same file across re-renders', () => {
    const { container, rerender } = render(
      <MediaLibraryCardGrid {...props} isSelectedFile={() => false} />,
    );

    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute(
      'aria-selected',
      'false',
    );

    rerender(<MediaLibraryCardGrid {...props} isSelectedFile={() => true} />);

    expect(container.querySelector('[data-cell-index="0"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('omits aria-selected on folder/directory items since they are not selectable', () => {
    const folderProps = {
      ...props,
      mediaItems: [
        { id: '1', key: '1', name: 'images', type: 'folder', isDirectory: true },
      ],
      isSelectedFile: vi.fn(() => false),
    };
    const { container } = render(<MediaLibraryCardGrid {...folderProps} />);

    const cell = container.querySelector('[data-cell-index="0"]') as HTMLElement;
    expect(cell).not.toHaveAttribute('aria-selected');
  });

  it('focuses the gridcell on click so the active cell tracks the pointer interaction', () => {
    const { container } = render(<MediaLibraryCardGrid {...multiItemProps} />);

    const cell2 = container.querySelector('[data-cell-index="2"]') as HTMLElement;
    fireEvent.click(cell2.querySelector('*') as HTMLElement);

    expect(document.activeElement).toBe(cell2);
    expect(cell2).toHaveAttribute('tabindex', '0');
  });
});
