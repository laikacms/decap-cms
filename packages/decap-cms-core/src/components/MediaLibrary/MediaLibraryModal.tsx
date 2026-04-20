import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Map } from 'immutable';
import isEmpty from 'lodash/isEmpty';
import { translate } from 'react-polyglot';
import { colors } from 'decap-cms-ui-default';
import type { TranslateFunction } from 'decap-cms-ui-default';

import { Modal } from '../UI';
import MediaLibraryTop from './MediaLibraryTop';
import MediaLibraryCardGrid from './MediaLibraryCardGrid';
import EmptyMessage from './EmptyMessage';

/**
 * Responsive styling needs to be overhauled. Current setup requires specifying
 * widths per breakpoint.
 */
const cardWidth = `280px`;
const cardHeight = `240px`;
const cardMargin = `10px`;

/**
 * cardWidth + cardMargin * 2 = cardOutsideWidth
 * (not using calc because this will be nested in other calcs)
 */
const cardOutsideWidth = `300px`;

const StyledModal = styled(Modal)<{ $isPrivate?: boolean }>`
  display: grid;
  grid-template-rows: 120px auto;
  width: calc(${cardOutsideWidth} + 20px);
  background-color: ${props => props.$isPrivate && colors.inactive};

  @media (width >= 800px) {
    width: calc(${cardOutsideWidth} * 2 + 20px);
  }

  @media (width >= 1120px) {
    width: calc(${cardOutsideWidth} * 3 + 20px);
  }

  @media (width >= 1440px) {
    width: calc(${cardOutsideWidth} * 4 + 20px);
  }

  @media (width >= 1760px) {
    width: calc(${cardOutsideWidth} * 5 + 20px);
  }

  @media (width >= 2080px) {
    width: calc(${cardOutsideWidth} * 6 + 20px);
  }

  h1 {
    color: ${props => props.$isPrivate && colors.textFieldBorder};
  }

  button:disabled,
  label[disabled] {
    background-color: ${props => props.$isPrivate && `rgba(217, 217, 217, 0.15)`};
  }
`;

interface MediaFile {
  id: string;
  name: string;
  displayURL?: string | { original: string };
  path: string;
  draft?: boolean;
  size?: number;
  url?: string;
  key?: string;
  type?: string;
}

interface MediaLibraryModalProps {
  isVisible?: boolean;
  canInsert?: boolean;
  files: MediaFile[];
  dynamicSearch?: boolean;
  dynamicSearchActive?: boolean;
  forImage?: boolean;
  isLoading?: boolean;
  isPersisting?: boolean;
  isDeleting?: boolean;
  hasNextPage?: boolean;
  isPaginating?: boolean;
  privateUpload?: boolean;
  query?: string;
  selectedFile?: MediaFile | Record<string, never>;
  handleFilter: (files: MediaFile[]) => MediaFile[];
  handleQuery: (query: string, files: MediaFile[]) => MediaFile[];
  toTableData: (files: MediaFile[]) => { displayURL?: string | Record<string, unknown>; id: string; key: string; name: string; type: string; draft?: boolean; url?: string; isViewableImage?: boolean }[];
  handleClose: () => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePersist: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDelete: () => void;
  handleInsert: () => void;
  handleDownload?: () => void;
  setScrollContainerRef: (ref: HTMLDivElement | null) => void;
  handleAssetClick: (asset: MediaFile) => void;
  handleLoadMore: () => void;
  loadDisplayURL: (file: MediaFile) => void;
  t: TranslateFunction;
  displayURLs: Map<string, unknown>;
}

function MediaLibraryModal({
  isVisible,
  canInsert,
  files,
  dynamicSearch,
  dynamicSearchActive,
  forImage,
  isLoading,
  isPersisting,
  isDeleting,
  hasNextPage,
  isPaginating,
  privateUpload,
  query,
  selectedFile,
  handleFilter,
  handleQuery,
  toTableData,
  handleClose,
  handleSearchChange,
  handleSearchKeyDown,
  handlePersist,
  handleDelete,
  handleInsert,
  handleDownload,
  setScrollContainerRef,
  handleAssetClick,
  handleLoadMore,
  loadDisplayURL,
  displayURLs,
  t,
}: MediaLibraryModalProps) {
  const filteredFiles = forImage ? handleFilter(files) : files;
  const queriedFiles = !dynamicSearch && query ? handleQuery(query, filteredFiles) : filteredFiles;
  const tableData = toTableData(queriedFiles);
  const hasFiles = files && !!files.length;
  const hasFilteredFiles = filteredFiles && !!filteredFiles.length;
  const hasSearchResults = queriedFiles && !!queriedFiles.length;
  const hasMedia = hasSearchResults;
  const shouldShowEmptyMessage = !hasMedia;
  const emptyMessage =
    (isLoading && !hasMedia && t('mediaLibrary.mediaLibraryModal.loading')) ||
    (dynamicSearchActive && t('mediaLibrary.mediaLibraryModal.noResults')) ||
    (!hasFiles && t('mediaLibrary.mediaLibraryModal.noAssetsFound')) ||
    (!hasFilteredFiles && t('mediaLibrary.mediaLibraryModal.noImagesFound')) ||
    (!hasSearchResults && t('mediaLibrary.mediaLibraryModal.noResults'));

  const hasSelection = hasMedia && !isEmpty(selectedFile);

  return (
    <StyledModal isOpen={!!isVisible} onClose={handleClose} $isPrivate={privateUpload}>
      <MediaLibraryTop
        t={t}
        onClose={handleClose}
        privateUpload={privateUpload}
        forImage={forImage}
        onDownload={handleDownload ?? (() => {})}
        onUpload={handlePersist}
        query={query}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleSearchKeyDown}
        searchDisabled={!dynamicSearchActive && !hasFilteredFiles}
        onDelete={handleDelete}
        canInsert={canInsert}
        onInsert={handleInsert}
        hasSelection={hasSelection}
        isPersisting={isPersisting}
        isDeleting={isDeleting}
        selectedFile={selectedFile as { path: string; draft: boolean; name: string } | Record<string, never> | undefined}
      />
      {!shouldShowEmptyMessage ? null : (
        <EmptyMessage content={emptyMessage || ''} isPrivate={privateUpload} />
      )}
      <MediaLibraryCardGrid
        setScrollContainerRef={setScrollContainerRef}
        mediaItems={tableData}
        isSelectedFile={file => !!selectedFile && 'key' in selectedFile && selectedFile.key === file.key}
        onAssetClick={handleAssetClick as (asset: { key: string; name: string; id: string; type: string; draft?: boolean }) => void}
        canLoadMore={hasNextPage}
        onLoadMore={handleLoadMore}
        isPaginating={isPaginating}
        paginatingMessage={t('mediaLibrary.mediaLibraryModal.loading')}
        cardDraftText={t('mediaLibrary.mediaLibraryCard.draft')}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        cardMargin={cardMargin}
        isPrivate={privateUpload}
        loadDisplayURL={loadDisplayURL as (file: { id: string; url?: string }) => void}
        displayURLs={displayURLs}
      />
    </StyledModal>
  );
}

export const fileShape = {
  displayURL: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  id: PropTypes.string.isRequired,
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  queryOrder: PropTypes.number,
  size: PropTypes.number,
  path: PropTypes.string.isRequired,
};

MediaLibraryModal.propTypes = {
  isVisible: PropTypes.bool,
  canInsert: PropTypes.bool,
  files: PropTypes.arrayOf(PropTypes.shape(fileShape)).isRequired,
  dynamicSearch: PropTypes.bool,
  dynamicSearchActive: PropTypes.bool,
  forImage: PropTypes.bool,
  isLoading: PropTypes.bool,
  isPersisting: PropTypes.bool,
  isDeleting: PropTypes.bool,
  hasNextPage: PropTypes.bool,
  isPaginating: PropTypes.bool,
  privateUpload: PropTypes.bool,
  query: PropTypes.string,
  selectedFile: PropTypes.oneOfType([PropTypes.shape(fileShape), PropTypes.shape({})]),
  handleFilter: PropTypes.func.isRequired,
  handleQuery: PropTypes.func.isRequired,
  toTableData: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleSearchChange: PropTypes.func.isRequired,
  handleSearchKeyDown: PropTypes.func.isRequired,
  handlePersist: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleInsert: PropTypes.func.isRequired,
  setScrollContainerRef: PropTypes.func.isRequired,
  handleAssetClick: PropTypes.func.isRequired,
  handleLoadMore: PropTypes.func.isRequired,
  loadDisplayURL: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  displayURLs: PropTypes.instanceOf(Map as unknown as new (...args: any[]) => Map<string, unknown>).isRequired,
};

export default translate()(MediaLibraryModal);
