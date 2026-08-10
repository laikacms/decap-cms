import styled from '@emotion/styled';
import { isEmpty } from 'lodash-es';
import React from 'react';

import { Modal } from '@/core/components/UI';
import { translate } from '@/core/i18n';
import { useCmsSlots } from '@/core/lib/slots';
import { selectMediaFolderEntries } from '@/core/reducers/mediaLibrary';
import { basename } from '@/lib/util/index';
import { colors } from '@/ui/default/index';
import EmptyMessage from './EmptyMessage';
import MediaLibraryAssetCollections from './MediaLibraryAssetCollections';
import MediaLibraryBreadcrumbs from './MediaLibraryBreadcrumbs';
import MediaLibraryCardGrid from './MediaLibraryCardGrid';
import MediaLibraryFolders from './MediaLibraryFolders';
import MediaLibraryTop from './MediaLibraryTop';

import type { MediaFolderBreadcrumb } from '@/core/reducers/mediaLibrary';
import type { CmsAssetCollection } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

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

const StyledModal = styled(Modal)<{ $isPrivate?: boolean | undefined }>`
  display: grid;
  /*
   * Explicit row per top-level child (Top | AssetCollections | Breadcrumbs |
   * Folders | EmptyMessage | CardGrid) so leftover height only ever flows
   * into the last (card grid) track instead of being distributed across
   * every "auto" row - see DCMS-1637. Unrendered optional rows collapse to
   * 0 since they receive no content.
   */
  grid-template-rows: 120px repeat(4, auto) 1fr;
  width: calc(${cardOutsideWidth} + 20px);
  max-width: 100vw;
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
    background-color: ${props => props.$isPrivate && colors.disabledOverlay};
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
  isDirectory?: boolean;
}

// The optionals mirror the media-library slice, which leaves them undefined
// until the library has been opened/loaded at least once.
interface MediaLibraryModalProps {
  isVisible?: boolean | undefined;
  canInsert?: boolean | undefined;
  files: MediaFile[];
  dynamicSearch?: boolean | undefined;
  dynamicSearchActive?: boolean | undefined;
  forImage?: boolean | undefined;
  isLoading?: boolean | undefined;
  isPersisting?: boolean | undefined;
  isDeleting?: boolean | undefined;
  hasNextPage?: boolean | undefined;
  isPaginating?: boolean | undefined;
  privateUpload?: boolean | undefined;
  query?: string | undefined;
  selectedFile?: MediaFile | Record<string, never> | undefined;
  handleFilter: (files: MediaFile[]) => MediaFile[];
  handleQuery: (query: string, files: MediaFile[]) => MediaFile[];
  toTableData: (files: MediaFile[]) => {
    displayURL?: string | Record<string, unknown> | undefined,
    id: string,
    key: string,
    name: string,
    type: string,
    draft?: boolean | undefined,
    url?: string | undefined,
    isViewableImage?: boolean | undefined,
  }[];
  handleClose: () => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePersist: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDelete: () => void;
  handleInsert: () => void;
  handleDownload?: (() => void) | undefined;
  setScrollContainerRef: (ref: HTMLDivElement | null) => void;
  handleAssetClick: (asset: MediaFile) => void;
  handleLoadMore: () => void;
  loadDisplayURL: (file: MediaFile) => void;
  t: TranslateFunction;
  displayURLs: Record<string, unknown>;
  breadcrumbs?: MediaFolderBreadcrumb[] | undefined;
  onNavigateFolder?: ((path: string) => void) | undefined;
  assetCollections?: CmsAssetCollection[] | undefined;
  activeAssetCollectionName?: string | undefined;
  onSelectAssetCollection?: ((assetCollection: CmsAssetCollection) => void) | undefined;
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
  breadcrumbs,
  onNavigateFolder,
  assetCollections = [],
  activeAssetCollectionName,
  onSelectAssetCollection,
  t,
}: MediaLibraryModalProps) {
  const { renderMediaLibraryTop } = useCmsSlots();
  const { folders, regularFiles } = selectMediaFolderEntries(files);
  const folderItems = folders.map(folder => ({ path: folder.path, name: basename(folder.path) }));
  const filteredFiles = forImage ? handleFilter(regularFiles) : regularFiles;
  const queriedFiles = !dynamicSearch && query ? handleQuery(query, filteredFiles) : filteredFiles;
  const tableData = toTableData(queriedFiles);
  const hasFiles = regularFiles && !!regularFiles.length;
  const hasFilteredFiles = filteredFiles && !!filteredFiles.length;
  const hasSearchResults = queriedFiles && !!queriedFiles.length;
  const hasMedia = hasSearchResults || !!folderItems.length;
  const shouldShowEmptyMessage = !hasMedia;
  const emptyMessage = (isLoading && !hasMedia && t('mediaLibrary.mediaLibraryModal.loading'))
    || (dynamicSearchActive && t('mediaLibrary.mediaLibraryModal.noResults'))
    || (!hasFiles && t('mediaLibrary.mediaLibraryModal.noAssetsFound'))
    || (!hasFilteredFiles && t('mediaLibrary.mediaLibraryModal.noImagesFound'))
    || (!hasSearchResults && t('mediaLibrary.mediaLibraryModal.noResults'));

  const hasSelection = hasMedia && !isEmpty(selectedFile);

  // DCMS-1278: mirrors the title text MediaLibraryTop/MediaLibraryHeader
  // renders, so the dialog's accessible name matches what's visible.
  const modalAriaLabel = `${privateUpload ? t('mediaLibrary.mediaLibraryModal.private') : ''}${
    forImage
      ? t('mediaLibrary.mediaLibraryModal.images')
      : t('mediaLibrary.mediaLibraryModal.mediaAssets')
  }`;

  return (
    <StyledModal
      isOpen={!!isVisible}
      onClose={handleClose}
      $isPrivate={privateUpload}
      ariaLabel={modalAriaLabel}
    >
      {(() => {
        const topProps = {
          onClose: handleClose,
          privateUpload,
          forImage,
          onDownload: handleDownload ?? (() => {}),
          onUpload: handlePersist,
          query,
          onSearchChange: handleSearchChange,
          onSearchKeyDown: handleSearchKeyDown,
          searchDisabled: !dynamicSearchActive && !hasFilteredFiles,
          onDelete: handleDelete,
          canInsert,
          onInsert: handleInsert,
          hasSelection,
          isPersisting,
          isDeleting,
          selectedFile: selectedFile as
            | { path: string, draft: boolean, name: string }
            | Record<string, never>
            | undefined,
        };
        return renderMediaLibraryTop
          ? (
            renderMediaLibraryTop(topProps)
          )
          : <MediaLibraryTop {...topProps} t={t} />;
      })()}
      {!onSelectAssetCollection
        ? null
        : (
          <MediaLibraryAssetCollections
            assetCollections={assetCollections}
            activeCollectionName={activeAssetCollectionName}
            onSelect={onSelectAssetCollection}
          />
        )}
      {!onNavigateFolder || !breadcrumbs
        ? null
        : <MediaLibraryBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigateFolder} />}
      {!onNavigateFolder
        ? null
        : <MediaLibraryFolders folders={folderItems} onNavigate={onNavigateFolder} />}
      {!shouldShowEmptyMessage ? null : <EmptyMessage content={emptyMessage || ''} isPrivate={privateUpload} />}
      <MediaLibraryCardGrid
        setScrollContainerRef={setScrollContainerRef}
        mediaItems={tableData}
        isSelectedFile={file => !!selectedFile && 'key' in selectedFile && selectedFile.key === file.key}
        onAssetClick={handleAssetClick as (asset: {
          key: string,
          name: string,
          id: string,
          type: string,
          draft?: boolean | undefined,
        }) => void}
        canLoadMore={hasNextPage}
        onLoadMore={handleLoadMore}
        isPaginating={isPaginating}
        paginatingMessage={t('mediaLibrary.mediaLibraryModal.loading')}
        cardDraftText={t('mediaLibrary.mediaLibraryCard.draft')}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        cardMargin={cardMargin}
        isPrivate={privateUpload}
        loadDisplayURL={loadDisplayURL as (file: { id: string, url?: string | undefined }) => void}
        displayURLs={displayURLs}
      />
    </StyledModal>
  );
}

export default translate()(MediaLibraryModal);
