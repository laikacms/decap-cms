import styled from '@emotion/styled';
import React from 'react';

import { colors, Icon, lengths } from '@/ui/default/index';

import type { CmsAssetCollection } from '@/lib/util/index';

const SectionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const SectionChip = styled.button<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: ${props => (props.$isActive ? colors.active : colors.inputBackground)};
  border: none;
  border-radius: ${lengths.borderRadius};
  padding: 6px 10px;
  font-size: 13px;
  font-weight: ${props => (props.$isActive ? 600 : 400)};
  color: ${props => (props.$isActive ? colors.textFieldBorder : colors.text)};
  cursor: pointer;

  &:hover,
  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${colors.active};
  }
`;

interface MediaLibraryAssetCollectionsProps {
  assetCollections: CmsAssetCollection[];
  activeCollectionName?: string | undefined;
  onSelect: (assetCollection: CmsAssetCollection) => void;
}

/**
 * Config-defined asset collections (DCMS-1412), rendered as selectable
 * sections above the folder tree/breadcrumbs so a site with named media
 * groupings (e.g. "Product photos", "Team headshots") can jump straight to
 * one instead of navigating the raw folder structure. Renders nothing when
 * the config declares none, so sites without `asset_collections` see no
 * change to the media library.
 */
function MediaLibraryAssetCollections({
  assetCollections,
  activeCollectionName,
  onSelect,
}: MediaLibraryAssetCollectionsProps) {
  if (!assetCollections.length) {
    return null;
  }

  return (
    <SectionsContainer aria-label="Asset collections">
      {assetCollections.map(collection => (
        <SectionChip
          key={collection.name}
          type="button"
          $isActive={collection.name === activeCollectionName}
          aria-pressed={collection.name === activeCollectionName}
          onClick={() => onSelect(collection)}
        >
          <Icon type="folder" size="small" />
          {collection.label}
        </SectionChip>
      ))}
    </SectionsContainer>
  );
}

export default MediaLibraryAssetCollections;
