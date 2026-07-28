import styled from '@emotion/styled';
import React from 'react';

import { useTranslate } from '@/core/i18n';
import { colors, Icon, lengths } from '@/ui/default/index';

const FoldersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const FolderChip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: ${colors.inputBackground};
  border: none;
  border-radius: ${lengths.borderRadius};
  padding: 6px 10px;
  font-size: 13px;
  color: ${colors.text};
  cursor: pointer;

  &:hover,
  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${colors.active};
  }
`;

export interface MediaLibraryFolderItem {
  path: string;
  name: string;
}

interface MediaLibraryFoldersProps {
  folders: MediaLibraryFolderItem[];
  onNavigate: (path: string) => void;
}

/**
 * Subfolders discovered in the current listing (only populated for backends
 * that flag directory entries — see `selectMediaFolderEntries`). Renders
 * nothing when there's nothing to browse into.
 */
function MediaLibraryFolders({ folders, onNavigate }: MediaLibraryFoldersProps) {
  const t = useTranslate();

  if (!folders.length) {
    return null;
  }

  return (
    <FoldersContainer aria-label={t('mediaLibrary.mediaLibraryFolders.regionLabel')}>
      {folders.map(folder => (
        <FolderChip key={folder.path} type="button" onClick={() => onNavigate(folder.path)}>
          <Icon type="folder" size="small" />
          {folder.name}
        </FolderChip>
      ))}
    </FoldersContainer>
  );
}

export default MediaLibraryFolders;
