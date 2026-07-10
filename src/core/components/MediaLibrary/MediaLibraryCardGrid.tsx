import React from 'react';
import styled from '@emotion/styled';
import { Waypoint } from 'react-waypoint';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { colors } from '../../../ui/default/index';
import MediaLibraryCard from './MediaLibraryCard';
import { useCmsSlots } from '../../lib/slots';

import type { MediaLibraryCardRenderProps } from '../../lib/slots';

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
    key: string;
    name: string;
    id: string;
    type: string;
    draft?: boolean;
  }) => void;
  cardDraftText: string;
  cardWidth: string;
  cardHeight: string;
  isPrivate?: boolean;
  displayURLs: Record<string, unknown>;
  loadDisplayURL: (file: { id: string; url?: string }) => void;
  columnCount: number;
  gutter: number;
}

function CardWrapper(
  props: {
    ariaAttributes: {
      'aria-colindex': number;
      role: 'gridcell';
    };
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
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
  const { mediaItems, setScrollContainerRef } = props;

  return (
    <CardGridContainer ref={setScrollContainerRef}>
      <AutoSizer
        renderProp={({
          height,
          width,
        }: {
          height: number | undefined;
          width: number | undefined;
        }) => {
          if (height === undefined || width === undefined) {
            return null;
          }
          const cardWidthNum = parseInt(props.cardWidth, 10);
          const cardHeightNum = parseInt(props.cardHeight, 10);
          const gutter = parseInt(props.cardMargin, 10);
          const columnWidth = cardWidthNum + gutter;
          const rowHeight = cardHeightNum + gutter;
          const columnCount = Math.floor(width / columnWidth);
          const rowCount = Math.ceil(mediaItems.length / columnCount);
          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              defaultWidth={width}
              defaultHeight={height}
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
          );
        }}
      />
    </CardGridContainer>
  );
}

function PaginatedGrid({
  setScrollContainerRef,
  mediaItems,
  isSelectedFile,
  onAssetClick,
  cardDraftText,
  cardWidth,
  cardHeight,
  cardMargin,
  isPrivate,
  displayURLs,
  loadDisplayURL,
  canLoadMore,
  onLoadMore,
  isPaginating,
  paginatingMessage,
}: MediaLibraryCardGridProps) {
  return (
    <CardGridContainer ref={setScrollContainerRef}>
      <CardGrid>
        {mediaItems.map((file: MediaItem) => (
          <MediaCardSlot
            key={file.key}
            isSelected={isSelectedFile(file)}
            text={file.name}
            onClick={() => onAssetClick(file)}
            isDraft={file.draft}
            draftText={cardDraftText}
            width={cardWidth}
            height={cardHeight}
            margin={cardMargin}
            isPrivate={isPrivate}
            displayURL={(displayURLs[file.id] || (file.url ? { url: file.url } : {})) as any}
            loadDisplayURL={() => loadDisplayURL(file)}
            type={file.type}
            isViewableImage={file.isViewableImage ?? false}
          />
        ))}
        {!canLoadMore ? null : <Waypoint onEnter={onLoadMore} />}
      </CardGrid>
      {!isPaginating ? null : (
        <PaginatingMessage $isPrivate={isPrivate}>{paginatingMessage}</PaginatingMessage>
      )}
    </CardGridContainer>
  );
}

const CardGridContainer = styled.div`
  overflow: auto;
  overflow-x: hidden;
`;

const CardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;

  margin-left: -10px;
  margin-right: -10px;
`;

const PaginatingMessage = styled.h1<{ $isPrivate?: boolean }>`
  color: ${props => props.$isPrivate && colors.textFieldBorder};
`;

interface MediaLibraryCardGridProps {
  setScrollContainerRef: (ref: HTMLDivElement | null) => void;
  mediaItems: MediaItem[];
  isSelectedFile: (file: { key: string }) => boolean;
  onAssetClick: (asset: {
    key: string;
    name: string;
    id: string;
    type: string;
    draft?: boolean;
  }) => void;
  canLoadMore?: boolean;
  onLoadMore: () => void;
  isPaginating?: boolean;
  paginatingMessage?: string;
  cardDraftText: string;
  cardWidth: string;
  cardHeight: string;
  cardMargin: string;
  loadDisplayURL: (file: { id: string; url?: string }) => void;
  isPrivate?: boolean;
  displayURLs: Record<string, unknown>;
}

function MediaLibraryCardGrid(props: MediaLibraryCardGridProps) {
  const { canLoadMore, isPaginating } = props;
  if (canLoadMore || isPaginating) {
    return <PaginatedGrid {...props} />;
  }
  return <VirtualizedGrid {...props} />;
}

export default MediaLibraryCardGrid;
