import styled from '@emotion/styled';
import React, { useCallback, useRef } from 'react';
import { Grid } from 'react-window';

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
  } = props;
  const index = rowIndex * columnCount + columnIndex;
  if (index >= mediaItems.length) {
    return null;
  }
  const file = mediaItems[index];

  return (
    <div
      tabIndex={0}
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

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setScrollContainerRef(node);
    },
    [setScrollContainerRef],
  );

  if (height === undefined || width === undefined) {
    return <CardGridContainer ref={setContainerRef} />;
  }

  const cardWidthNum = parseInt(props.cardWidth, 10);
  const cardHeightNum = parseInt(props.cardHeight, 10);
  const gutter = parseInt(props.cardMargin, 10);
  const columnWidth = cardWidthNum + gutter;
  const rowHeight = cardHeightNum + gutter;
  const columnCount = Math.max(1, Math.floor(width / columnWidth));
  const rowCount = Math.ceil(mediaItems.length / columnCount);

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
        columnCount={columnCount}
        columnWidth={columnWidth}
        rowCount={rowCount}
        rowHeight={rowHeight}
        defaultWidth={width}
        defaultHeight={height}
        onCellsRendered={handleCellsRendered}
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
