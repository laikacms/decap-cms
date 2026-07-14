import React from 'react';
import styled from '@emotion/styled';

import { Icon, shadows, colors, buttons } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

const CloseButton = styled.button`
  ${buttons.button};
  ${shadows.dropMiddle};
  position: absolute;
  margin-right: -40px;
  left: -40px;
  top: -40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${colors.foreground};
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LibraryTitle = styled.h1<{ $isPrivate?: boolean }>`
  line-height: 36px;
  font-size: 22px;
  text-align: left;
  margin-bottom: 25px;
  color: ${props => props.$isPrivate && colors.textFieldBorder};
`;

interface MediaLibraryHeaderProps {
  onClose: () => void;
  title: string;
  isPrivate?: boolean;
  t: TranslateFunction;
}

function MediaLibraryHeader({ onClose, title, isPrivate, t }: MediaLibraryHeaderProps) {
  return (
    <div>
      <CloseButton
        className="CloseButton"
        aria-label={t('mediaLibrary.mediaLibraryModal.close')}
        onClick={onClose}
      >
        <Icon type="close" />
      </CloseButton>
      <LibraryTitle $isPrivate={isPrivate}>{title}</LibraryTitle>
    </div>
  );
}

export default MediaLibraryHeader;
