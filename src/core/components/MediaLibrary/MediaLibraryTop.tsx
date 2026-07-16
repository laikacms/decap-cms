import React from 'react';
import styled from '@emotion/styled';

import MediaLibrarySearch from './MediaLibrarySearch';
import MediaLibraryHeader from './MediaLibraryHeader';
import {
  UploadButton,
  DeleteButton,
  DownloadButton,
  CopyToClipBoardButton,
  InsertButton,
} from './MediaLibraryButtons';

import type { TranslateFunction } from '@/ui/default/index';

const LibraryTop = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const RowContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
`;

const ButtonsContainer = styled.div`
  flex-shrink: 0;
`;

interface MediaLibraryTopProps {
  t: TranslateFunction;
  onClose: () => void;
  privateUpload?: boolean;
  forImage?: boolean;
  onDownload: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  query?: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  searchDisabled: boolean;
  onDelete: () => void;
  canInsert?: boolean;
  onInsert: () => void;
  hasSelection: boolean;
  isPersisting?: boolean;
  isDeleting?: boolean;
  selectedFile?: { path: string; draft: boolean; name: string } | Record<string, never>;
}

function MediaLibraryTop({
  t,
  onClose,
  privateUpload,
  forImage,
  onDownload,
  onUpload,
  query,
  onSearchChange,
  onSearchKeyDown,
  searchDisabled,
  onDelete,
  canInsert,
  onInsert,
  hasSelection,
  isPersisting,
  isDeleting,
  selectedFile,
}: MediaLibraryTopProps) {
  const shouldShowButtonLoader = isPersisting || isDeleting;
  const uploadEnabled = !shouldShowButtonLoader;
  const deleteEnabled = !shouldShowButtonLoader && hasSelection;

  const uploadButtonLabel = isPersisting
    ? t('mediaLibrary.mediaLibraryModal.uploading')
    : t('mediaLibrary.mediaLibraryModal.upload');
  const deleteButtonLabel = isDeleting
    ? t('mediaLibrary.mediaLibraryModal.deleting')
    : t('mediaLibrary.mediaLibraryModal.deleteSelected');
  const downloadButtonLabel = t('mediaLibrary.mediaLibraryModal.download');
  const insertButtonLabel = t('mediaLibrary.mediaLibraryModal.chooseSelected');

  return (
    <LibraryTop>
      <RowContainer>
        <MediaLibraryHeader
          onClose={onClose}
          title={`${privateUpload ? t('mediaLibrary.mediaLibraryModal.private') : ''}${
            forImage
              ? t('mediaLibrary.mediaLibraryModal.images')
              : t('mediaLibrary.mediaLibraryModal.mediaAssets')
          }`}
          isPrivate={privateUpload}
          t={t}
        />
        <ButtonsContainer>
          <CopyToClipBoardButton
            disabled={!hasSelection}
            path={selectedFile?.path}
            name={selectedFile?.name}
            draft={selectedFile?.draft}
            t={t}
          />
          <DownloadButton onClick={onDownload} disabled={!hasSelection}>
            {downloadButtonLabel}
          </DownloadButton>
          <UploadButton
            label={uploadButtonLabel}
            imagesOnly={forImage}
            onChange={onUpload}
            disabled={!uploadEnabled}
          />
        </ButtonsContainer>
      </RowContainer>
      <RowContainer>
        <MediaLibrarySearch
          value={query}
          onChange={onSearchChange}
          onKeyDown={onSearchKeyDown}
          placeholder={t('mediaLibrary.mediaLibraryModal.search')}
          disabled={searchDisabled}
        />
        <ButtonsContainer>
          <DeleteButton onClick={onDelete} disabled={!deleteEnabled}>
            {deleteButtonLabel}
          </DeleteButton>
          {!canInsert ? null : (
            <InsertButton onClick={onInsert} disabled={!hasSelection}>
              {insertButtonLabel}
            </InsertButton>
          )}
        </ButtonsContainer>
      </RowContainer>
    </LibraryTop>
  );
}

export default MediaLibraryTop;
