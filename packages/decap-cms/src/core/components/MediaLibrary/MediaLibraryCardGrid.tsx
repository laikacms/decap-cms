import styled from '@emotion/styled';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Grid, useGridRef } from 'react-window';

import { useCmsSlots } from '@/core/lib/slots';
import { colors } from '@/ui/default/index';
import { useElementSize } from '@/ui/hooks/useElementSize';
import MediaLibraryCard from './MediaLibraryCard';

import type { MediaLibraryCardRenderProps } from '@/core/lib/slots';

/**
 * Request the next page when the user has rendered cells within this many
 * rows of the end of the loaded set, so scrolling never visibly hits the
 * bottom before more items arrive.
 */
const PRELOAD_ROW_THRESHOLD = 3;

/**
 * Picks between the slot-supplied media card renderer and the default
 * `MediaLibraryCard`. Encapsulated as a small component so both grid
 * call sites can share the hook lookup without prop drilling.
 */
function MediaCardSlot(props: MediaLibraryCardRenderProps) {
  const { renderMediaLibraryCard } = useCmsSlots();
  if (renderMediaLibraryCard) {
    return <>{renderMediaLibraryCard(props)}</>;
  }
  return <MediaLibraryCard {...props} />;
}

interface MediaItem {
  displayURL?: string | Record<string, unknown>;
  id: string;
  key: string;
  name: string;
  type: string;
  draft?: boolean;
  url?: string;
  isViewableImage?: boolean;
}

interface CardCellProps {
  mediaItems: MediaItem[];
  isSelectedFile: (file: { key: string }) => boolean;
  onAssetClick: (asset: {
    key: string,
    name: string,
    id: string,
    type: string,
    draft?: boolean,
  }) => void;
  cardDraftText: string;
  cardWidth: string;
  cardHeight: string;
  isPrivate?: boolean;
  displayURLs: Record<string, unknown>;
  loadDisplayURL: (file: { id: string, url?: string }) => void;
  columnCount: number;
  gutter: number;
  activeIndex: number;
  registerCellRef: (index: number, node: HTMLDivElement | null) => void;
  onCellFocus: (index: number) => void;
}

function CardWrapper(
  props: {
    ariaAttributes: {
      'aria-colindex': number,
      role: 'gridcell',
    },
    columnIndex: number,
    rowIndex: number,
    style: React.CSSProperties,
  } & CardCellProps,
) {
  const {
    ariaAttributes,
    rowIndex,
    columnIndex,
    style,
    mediaItems,
    isSelectedFile,
    onAssetClick,
    cardDraftText,
    cardWidth,
    cardHeight,
    isPrivate,
    displayURLs,
    loadDisplayURL,
    columnCount,
    gutter,
    activeIndex,
    registerCellRef,
    onCellFocus,
  } = props;
  const index = rowIndex * columnCount + columnIndex;
  if (index >= mediaItems.length) {
    return null;
  }
  const file = mediaItems[index];
  const isActive = index === activeIndex;

  return (
    <div
      {...ariaAttributes}
      ref={node => registerCellRef(index, node)}
      data-cell-index={index}
      // Roving tabindex (WAI-ARIA Grid pattern): only the active cell is a
      // Tab stop; arrow keys move which cell is active. Without this every
      // cell would be its own Tab stop, so leaving an N-item grid via Tab
      // would take N presses.
      tabIndex={isActive ? 0 : -1}
      onFocus={() => {
        if (!isActive) {
          onCellFocus(index);
        }
      }}
      style={{
        ...style,
        left: (typeof style.left === 'number' ? style.left : 0) + gutter * columnIndex,
        top: (typeof style.top === 'number' ? style.top : 0) + gutter,
        width: (typeof style.width === 'number' ? style.width : 0) - gutter,
        height: (typeof style.height === 'number' ? style.height : 0) - gutter,
      }}
    >
      <MediaCardSlot
        key={file.key}
        isSelected={isSelectedFile(file)}
        text={file.name}
        onClick={() => onAssetClick(file)}
        isDraft={file.draft}
        draftText={cardDraftText}
        width={cardWidth}
        height={cardHeight}
        margin={'0px'}
        isPrivate={isPrivate}
        displayURL={(displayURLs[file.id] || (file.url ? { url: file.url } : {})) as any}
        loadDisplayURL={() => loadDisplayURL(file)}
        type={file.type}
        isViewableImage={file.isViewableImage ?? false}
      />
    </div>
  );
}

function VirtualizedGrid(props: MediaLibraryCardGridProps) {
  const { mediaItems, setScrollContainerRef, canLoadMore, onLoadMore, isPaginating, paginatingMessage } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(containerRef);

  // One next-page request per loaded set: remember the item count we last
  // requested more for, so re-renders and scroll jitter near the end don't
  // fire duplicate loads while the same page is in flight.
  const lastRequestedAtCountRef = useRef(-1);

  // Roving-tabindex state (WAI-ARIA Grid pattern): `activeIndex` is the one
  // cell that is a Tab stop; arrow/Home/End keys move it, and DOM focus is
  // synced to match via the effect below.
  const [activeIndex, setActiveIndex] = useState(0);
  const cellRefsRef = useRef(new Map<number, HTMLDivElement>());
  const pendingFocusRef = useRef(false);
  const gridRef = useGridRef(null);

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setScrollContainerRef(node);
    },
    [setScrollContainerRef],
  );

  const cardWidthNum = parseInt(props.cardWidth, 10);
  const cardHeightNum = parseInt(props.cardHeight, 10);
  const gutter = parseInt(props.cardMargin, 10);
  const columnWidth = cardWidthNum + gutter;
  const rowHeight = cardHeightNum + gutter;
  const columnCount = Math.max(1, Math.floor((width ?? 0) / columnWidth));
  const rowCount = Math.ceil(mediaItems.length / columnCount);

  const clampedActiveIndex =
    mediaItems.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, mediaItems.length - 1));

  const registerCellRef = useCallback((index: number, node: HTMLDivElement | null) => {
    if (node) {
      cellRefsRef.current.set(index, node);
    } else {
      cellRefsRef.current.delete(index);
    }
  }, []);

  const focusActiveCell = useCallback(() => {
    const node = cellRefsRef.current.get(clampedActiveIndex);
    if (node) {
      node.focus();
      return true;
    }
    return false;
  }, [clampedActiveIndex]);

  // Only (re)focus the DOM when navigation actually requested it
  // (`pendingFocusRef`) — otherwise mounting/resizing would steal focus from
  // whatever the user was last interacting with (e.g. the Search input).
  useEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    if (focusActiveCell()) return;
    // The target cell may not be mounted yet if scrollToCell just moved it
    // into the virtualized window; retry on the next frame once it renders.
    const raf = requestAnimationFrame(() => {
      focusActiveCell();
    });
    return () => cancelAnimationFrame(raf);
  }, [clampedActiveIndex, focusActiveCell]);

  const moveActiveIndex = useCallback(
    (nextIndex: number) => {
      if (mediaItems.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, mediaItems.length - 1));
      const rowIndex = Math.floor(clamped / columnCount);
      const columnIndex = clamped % columnCount;
      gridRef.current?.scrollToCell({ rowIndex, columnIndex, behavior: 'auto' });
      pendingFocusRef.current = true;
      setActiveIndex(clamped);
    },
    [mediaItems.length, columnCount, gridRef],
  );

  // Mouse clicks (and any other means) can move DOM focus to a non-active
  // cell (tabindex=-1 is still focusable by click); keep the roving-tabindex
  // marker in sync so a later Tab press leaves from the right place.
  const handleCellFocus = useCallback((index: number) => {
    pendingFocusRef.current = false;
    setActiveIndex(index);
  }, []);

  const onAssetClick = props.onAssetClick;
  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (mediaItems.length === 0) return;
      const currentIndex = clampedActiveIndex;
      const rowStart = Math.floor(currentIndex / columnCount) * columnCount;
      const rowEnd = Math.min(rowStart + columnCount - 1, mediaItems.length - 1);

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          moveActiveIndex(Math.min(currentIndex + 1, rowEnd));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveActiveIndex(Math.max(currentIndex - 1, rowStart));
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveActiveIndex(Math.min(currentIndex + columnCount, mediaItems.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveActiveIndex(Math.max(currentIndex - columnCount, 0));
          break;
        case 'Home':
          event.preventDefault();
          moveActiveIndex(event.ctrlKey ? 0 : rowStart);
          break;
        case 'End':
          event.preventDefault();
          moveActiveIndex(event.ctrlKey ? mediaItems.length - 1 : rowEnd);
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar': {
          event.preventDefault();
          const file = mediaItems[currentIndex];
          if (file) {
            onAssetClick(file);
          }
          break;
        }
        default:
          break;
      }
    },
    [mediaItems, columnCount, clampedActiveIndex, moveActiveIndex, onAssetClick],
  );

  if (height === undefined || width === undefined) {
    return <CardGridContainer ref={setContainerRef} />;
  }

  function handleCellsRendered(
    _visibleCells: { rowStartIndex: number, rowStopIndex: number },
    allCells: { rowStartIndex: number, rowStopIndex: number },
  ) {
    if (!canLoadMore || isPaginating) return;
    if (allCells.rowStopIndex < rowCount - 1 - PRELOAD_ROW_THRESHOLD) return;
    if (lastRequestedAtCountRef.current === mediaItems.length) return;
    lastRequestedAtCountRef.current = mediaItems.length;
    onLoadMore();
  }

  return (
    <CardGridContainer ref={setContainerRef}>
      <Grid
        aria-label="Media assets"
        columnCount={columnCount}
        columnWidth={columnWidth}
        rowCount={rowCount}
        rowHeight={rowHeight}
        defaultWidth={width}
        defaultHeight={height}
        onCellsRendered={handleCellsRendered}
        onKeyDown={handleGridKeyDown}
        gridRef={gridRef}
        cellComponent={CardWrapper}
        cellProps={{
          mediaItems: props.mediaItems,
          isSelectedFile: props.isSelectedFile,
          onAssetClick: props.onAssetClick,
          cardDraftText: props.cardDraftText,
          cardWidth: props.cardWidth,
          cardHeight: props.cardHeight,
          isPrivate: props.isPrivate,
          displayURLs: props.displayURLs,
          loadDisplayURL: props.loadDisplayURL,
          columnCount,
          gutter,
          activeIndex: clampedActiveIndex,
          registerCellRef,
          onCellFocus: handleCellFocus,
        }}
      />
      {!isPaginating ? null : <PaginatingMessage $isPrivate={props.isPrivate}>{paginatingMessage}</PaginatingMessage>}
    </CardGridContainer>
  );
}

const CardGridContainer = styled.div`
  overflow: auto;
  overflow-x: hidden;
`;

const PaginatingMessage = styled.h1<{ $isPrivate?: boolean }>`
  color: ${props => props.$isPrivate && colors.textFieldBorder};
`;

interface MediaLibraryCardGridProps {
  setScrollContainerRef: (ref: HTMLDivElement | null) => void;
  mediaItems: MediaItem[];
  isSelectedFile: (file: { key: string }) => boolean;
  onAssetClick: (asset: {
    key: string,
    name: string,
    id: string,
    type: string,
    draft?: boolean,
  }) => void;
  canLoadMore?: boolean;
  onLoadMore: () => void;
  isPaginating?: boolean;
  paginatingMessage?: string;
  cardDraftText: string;
  cardWidth: string;
  cardHeight: string;
  cardMargin: string;
  loadDisplayURL: (file: { id: string, url?: string }) => void;
  isPrivate?: boolean;
  displayURLs: Record<string, unknown>;
}

function MediaLibraryCardGrid(props: MediaLibraryCardGridProps) {
  // One grid for every mode: the virtualized grid handles both the
  // fully-loaded case and cursor-paginated infinite scroll (it requests the
  // next page via onCellsRendered as the user nears the end).
  return <VirtualizedGrid {...props} />;
}

export default MediaLibraryCardGrid;
