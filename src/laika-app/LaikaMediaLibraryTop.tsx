/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { useTranslate } from 'react-polyglot';

import { Icon, colors } from '@/ui/default/index';
import { LaikaButton, LaikaIconButton, LaikaSearchInput, LaikaBadge } from './ui';

import type { MediaLibraryTopRenderProps } from '@/app/components/index';

/**
 * Laika-styled MediaLibrary header. Replaces core's MediaLibraryTop via
 * the renderMediaLibraryTop slot — re-skins title + search + actions
 * using laika primitives (LaikaButton / LaikaIconButton / LaikaSearchInput)
 * while preserving all the original handlers and disabled-state logic.
 */

const TopShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 4px 16px;
  border-bottom: 1px solid ${colors.textFieldBorder};
  margin-bottom: 16px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Title = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const SearchSlot = styled.div`
  flex: 1 1 280px;
  min-width: 200px;
`;

const ButtonGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

function LaikaMediaLibraryTop({
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
}: MediaLibraryTopRenderProps) {
  const t = useTranslate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const titleLabel = forImage
    ? t('mediaLibrary.mediaLibraryModal.images')
    : t('mediaLibrary.mediaLibraryModal.mediaAssets');

  const uploadLabel = isPersisting
    ? t('mediaLibrary.mediaLibraryModal.uploading')
    : t('mediaLibrary.mediaLibraryModal.upload');
  const deleteLabel = isDeleting
    ? t('mediaLibrary.mediaLibraryModal.deleting')
    : t('mediaLibrary.mediaLibraryModal.deleteSelected');
  const downloadLabel = t('mediaLibrary.mediaLibraryModal.download');
  const insertLabel = t('mediaLibrary.mediaLibraryModal.chooseSelected');
  const searchPlaceholder = t('mediaLibrary.mediaLibraryModal.search');

  const shouldShowLoader = isPersisting || isDeleting;
  const uploadDisabled = shouldShowLoader;
  const deleteDisabled = shouldShowLoader || !hasSelection;

  return (
    <TopShell>
      <TitleRow>
        <Title>
          {titleLabel}
          {privateUpload ? (
            <LaikaBadge intent="warning">{t('mediaLibrary.mediaLibraryModal.private')}</LaikaBadge>
          ) : null}
        </Title>
        <LaikaIconButton aria-label="Close" onClick={onClose}>
          <Icon type="close" />
        </LaikaIconButton>
      </TitleRow>
      <ActionRow>
        <SearchSlot>
          <LaikaSearchInput
            value={query ?? ''}
            onChange={onSearchChange}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            disabled={searchDisabled}
            aria-label={searchPlaceholder}
          />
        </SearchSlot>
        <ButtonGroup>
          <LaikaButton variant="ghost" size="sm" disabled={!hasSelection} onClick={onDownload}>
            {downloadLabel}
          </LaikaButton>
          <LaikaButton variant="danger" size="sm" disabled={deleteDisabled} onClick={onDelete}>
            {deleteLabel}
          </LaikaButton>
          <LaikaButton
            variant="secondary"
            size="sm"
            disabled={uploadDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadLabel}
          </LaikaButton>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept={forImage ? 'image/*' : undefined}
            multiple
            onChange={onUpload}
          />
          {canInsert ? (
            <LaikaButton size="sm" disabled={!hasSelection} onClick={onInsert}>
              {insertLabel}
            </LaikaButton>
          ) : null}
        </ButtonGroup>
      </ActionRow>
    </TopShell>
  );
}

export default LaikaMediaLibraryTop;
