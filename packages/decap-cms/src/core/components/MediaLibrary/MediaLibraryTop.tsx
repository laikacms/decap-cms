import styled from '@emotion/styled';
import React from 'react';

import {
  CameraCaptureButton,
  CopyToClipBoardButton,
  DeleteButton,
  DownloadButton,
  InsertButton,
  QrScanButton,
  ScreenCaptureButton,
  UploadButton,
} from './MediaLibraryButtons';
import MediaLibraryHeader from './MediaLibraryHeader';
import MediaLibrarySearch from './MediaLibrarySearch';

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
  privateUpload?: boolean | undefined;
  forImage?: boolean | undefined;
  onDownload: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Undefined unless `forImage` is true AND the current environment
   * supports the corresponding capture API (e.g. `getUserMedia`/
   * `getDisplayMedia` missing, or a non-browser/test environment, both
   * count as unsupported); the button is hidden rather than
   * shown-disabled in that case, mirroring how other capability-gated UI
   * in this app behaves. Camera/screen capture only makes sense for the
   * image picker, so it is always undefined for the plain `file` widget
   * regardless of capture API support (see `MediaLibrary.tsx`, DCMS-2011).
   */
  onOpenCamera?: (() => void) | undefined;
  onOpenScreenCapture?: (() => void) | undefined;
  /**
   * DCMS-2229 QR-code scan: undefined-means-hide-the-button, same as
   * `onOpenCamera`/`onOpenScreenCapture` — always undefined for the plain
   * `file` widget. Unlike those two, this isn't further gated on
   * `getUserMedia` support: the dialog also supports decoding from an
   * uploaded image, which works with no camera API at all (the live-scan
   * half just shows an inline "camera unavailable" message in that case).
   */
  onOpenQrScan?: (() => void) | undefined;
  query?: string | undefined;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  searchDisabled: boolean;
  onDelete: () => void;
  canInsert?: boolean | undefined;
  onInsert: () => void;
  hasSelection: boolean;
  isPersisting?: boolean | undefined;
  isDeleting?: boolean | undefined;
  selectedFile?: { path: string, draft: boolean, name: string } | Record<string, never> | undefined;
}

function MediaLibraryTop({
  t,
  onClose,
  privateUpload,
  forImage,
  onDownload,
  onUpload,
  onOpenCamera,
  onOpenScreenCapture,
  onOpenQrScan,
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
          <DownloadButton onClick={onDownload} disabled={!hasSelection} aria-disabled={!hasSelection}>
            {downloadButtonLabel}
          </DownloadButton>
          {!onOpenCamera ? null : (
            <CameraCaptureButton onClick={onOpenCamera} disabled={!uploadEnabled} aria-disabled={!uploadEnabled}>
              {t('mediaLibrary.mediaLibraryModal.captureCamera')}
            </CameraCaptureButton>
          )}
          {!onOpenScreenCapture ? null : (
            <ScreenCaptureButton
              onClick={onOpenScreenCapture}
              disabled={!uploadEnabled}
              aria-disabled={!uploadEnabled}
            >
              {t('mediaLibrary.mediaLibraryModal.captureScreen')}
            </ScreenCaptureButton>
          )}
          {!onOpenQrScan ? null : (
            <QrScanButton onClick={onOpenQrScan} disabled={!uploadEnabled} aria-disabled={!uploadEnabled}>
              {t('mediaLibrary.mediaLibraryModal.scanQrCode')}
            </QrScanButton>
          )}
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
          <DeleteButton onClick={onDelete} disabled={!deleteEnabled} aria-disabled={!deleteEnabled}>
            {deleteButtonLabel}
          </DeleteButton>
          {!canInsert ? null : (
            <InsertButton onClick={onInsert} disabled={!hasSelection} aria-disabled={!hasSelection}>
              {insertButtonLabel}
            </InsertButton>
          )}
        </ButtonsContainer>
      </RowContainer>
    </LibraryTop>
  );
}

export default MediaLibraryTop;
