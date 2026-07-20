
import styled from '@emotion/styled';
import React from 'react';

import { colors, lengths } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';
import { handleNavItemKeyDown, navItemProps } from './listNav';
import { LaikaBadge } from './ui';

import type { MediaLibraryCardRenderProps } from '@/app/components/index';

/**
 * Laika-styled media library card. Replaces core's MediaLibraryCard via
 * the renderMediaLibraryCard slot. The async displayURL behavior, draft
 * indicator, and selection wiring are kept; the visual treatment is
 * rebuilt with laika's rounded surface + soft active ring.
 */

const Card = styled('button', { shouldForwardProp: laikaShouldForwardProp })<{
  $isSelected?: boolean,
  $isPrivate?: boolean,
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  background-color: ${({ $isPrivate }) => $isPrivate ? colors.activeBackground : colors.foreground};
  border: 1px solid ${({ $isSelected }) => ($isSelected ? colors.active : colors.textFieldBorder)};
  border-radius: ${lengths.borderRadius};
  box-shadow: ${({ $isSelected }) => $isSelected ? `0 0 0 3px ${colors.activeBackground}` : 'none'};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: ${colors.active};
  }
`;

const ImageWrap = styled.div`
  position: relative;
  width: 100%;
  height: 160px;
  background-color: ${colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid ${colors.textFieldBorder};
  overflow: hidden;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const FilePlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${colors.controlLabel};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
`;

const DraftBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
`;

const Caption = styled.span`
  display: block;
  padding: 10px 12px;
  font-size: 13px;
  color: ${colors.textLead};
  line-height: 1.3;
  overflow-wrap: break-word;
`;

function LaikaMediaLibraryCard({
  isSelected,
  displayURL,
  text,
  onClick,
  draftText,
  width,
  height,
  margin,
  isPrivate,
  type,
  isViewableImage,
  loadDisplayURL,
  isDraft,
}: MediaLibraryCardRenderProps) {
  const url = displayURL['url'] as string | undefined;

  React.useEffect(() => {
    if (!url) {
      loadDisplayURL();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only displayURL load (mirrors core)
  }, []);

  return (
    <Card
      type="button"
      onClick={onClick}
      onKeyDown={handleNavItemKeyDown}
      $isSelected={isSelected}
      $isPrivate={isPrivate}
      style={{ width, height, margin }}
      {...navItemProps}
    >
      <ImageWrap>
        {isDraft
          ? (
            <DraftBadge>
              <LaikaBadge intent="draft">{draftText}</LaikaBadge>
            </DraftBadge>
          )
          : null}
        {url && isViewableImage
          ? <PreviewImage loading="lazy" src={url} alt={text} />
          : <FilePlaceholder>{type || 'file'}</FilePlaceholder>}
      </ImageWrap>
      <Caption>{text}</Caption>
    </Card>
  );
}

export default LaikaMediaLibraryCard;
