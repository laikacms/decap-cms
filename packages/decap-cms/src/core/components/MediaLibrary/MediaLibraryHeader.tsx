import styled from '@emotion/styled';
import React from 'react';

import { buttons, colors, Icon, shadows } from '@/ui/default/index';

import type { TranslateFunction } from '@/ui/default/index';

// Below this width the modal is edge-to-edge (see MediaLibraryModal's
// max-width: 100vw), so the close button's -40px offset would be clipped
// off-screen; it switches to sitting inline with the title instead.
const narrowViewport = `(width < 500px)`;

const HeaderContainer = styled.div`
  @media ${narrowViewport} {
    width: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
  }
`;

const CloseButton = styled.button`
  ${buttons.button};
  background-color: ${colors.foreground};
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (width >= 500px) {
    ${shadows.dropMiddle};
    position: absolute;
    margin-right: -40px;
    left: -40px;
    top: -40px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
`;

const LibraryTitle = styled.h1<{ $isPrivate?: boolean | undefined }>`
  font-size: 18px;
  line-height: 28px;
  text-align: left;
  margin-bottom: 0;
  color: ${props => props.$isPrivate && colors.textFieldBorder};

  @media (width >= 500px) {
    font-size: 22px;
    line-height: 36px;
    margin-bottom: 25px;
  }
`;

interface MediaLibraryHeaderProps {
  onClose: () => void;
  title: string;
  isPrivate?: boolean | undefined;
  t: TranslateFunction;
}

function MediaLibraryHeader({ onClose, title, isPrivate, t }: MediaLibraryHeaderProps) {
  return (
    <HeaderContainer>
      <CloseButton
        className="CloseButton"
        aria-label={t('mediaLibrary.mediaLibraryModal.close')}
        onClick={onClose}
      >
        <Icon type="close" />
      </CloseButton>
      <LibraryTitle $isPrivate={isPrivate}>{title}</LibraryTitle>
    </HeaderContainer>
  );
}

export default MediaLibraryHeader;
