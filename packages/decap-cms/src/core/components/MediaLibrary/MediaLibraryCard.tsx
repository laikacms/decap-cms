import styled from '@emotion/styled';
import React from 'react';

import { borders, colors, effects, lengths, shadows } from '@/ui/default/index';

const IMAGE_HEIGHT = 160;

interface CardStyleProps {
  $height: string;
  $margin: string;
  $isSelected?: boolean | undefined;
  $isPrivate?: boolean | undefined;
}

const Card = styled.div<CardStyleProps>`
  /* Fills the width the grid cell allocates instead of a fixed px value, so a
     single-column layout at small viewports (see MediaLibraryCardGrid's
     columnCount clamp) doesn't overflow its container. */
  width: 100%;
  height: ${props => props.$height};
  margin: ${props => props.$margin};
  border: ${borders.textField};
  border-color: ${props => props.$isSelected && colors.active};
  border-radius: ${lengths.borderRadius};
  cursor: pointer;
  overflow: hidden;
  background-color: ${props => props.$isPrivate && colors.textFieldBorder};

  &:focus {
    outline: none;
  }
`;

const CardImageWrapper = styled.div`
  height: ${IMAGE_HEIGHT + 2}px;
  ${effects.checkerboard};
  ${shadows.inset};
  border-bottom: solid ${lengths.borderWidth} ${colors.textFieldBorder};
  position: relative;
`;

const CardImage = styled.img`
  width: 100%;
  height: ${IMAGE_HEIGHT}px;
  object-fit: contain;
  border-radius: 2px 2px 0 0;
`;

const CardFileIcon = styled.div`
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 2px 2px 0 0;
  padding: 1em;
  font-size: 3em;
`;

const CardText = styled.p`
  color: ${colors.text};
  padding: 8px;
  margin-top: 20px;
  overflow-wrap: break-word;
  line-height: 1.3 !important;
`;

const CardFileSize = styled.p`
  color: ${colors.controlLabel};
  padding: 0 8px 8px;
  margin: -12px 0 0;
  font-size: 12px;
`;

const DraftText = styled.p`
  color: ${colors.mediaDraftText};
  background-color: ${colors.mediaDraftBackground};
  position: absolute;
  padding: 8px;
  border-radius: ${lengths.borderRadius} 0 ${lengths.borderRadius} 0;
`;

/**
 * DCMS-2174: renders a byte count as a short human-readable string (e.g.
 * `92 KB`, `30.0 MB`) so a media card can hint at asset weight without the
 * operator having to download or inspect the file. `undefined`/`NaN` sizes
 * (unknown yet, still loading) render nothing.
 */
export function formatFileSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return undefined;
  }
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1000;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  // KB renders as a whole number (e.g. "92 KB"); MB and above keep one
  // decimal place (e.g. "30.0 MB") since whole units are coarser there.
  const decimals = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

interface MediaLibraryCardProps {
  isSelected?: boolean;
  displayURL: Record<string, unknown>;
  text: string;
  onClick: () => void;
  draftText: string;
  width: string;
  height: string;
  margin: string;
  isPrivate?: boolean | undefined;
  type?: string;
  size?: number | undefined;
  isViewableImage: boolean;
  loadDisplayURL: () => void;
  isDraft?: boolean | undefined;
}

function MediaLibraryCard({
  isSelected,
  displayURL,
  text,
  onClick,
  draftText,
  height,
  margin,
  isPrivate,
  type,
  size,
  isViewableImage,
  loadDisplayURL,
  isDraft,
}: MediaLibraryCardProps) {
  const url = displayURL['url'] as string | undefined;
  const formattedSize = formatFileSize(size);

  React.useEffect(() => {
    if (!displayURL['url']) {
      loadDisplayURL();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only displayURL load
  }, []);

  return (
    <Card
      $isSelected={isSelected}
      onClick={onClick}
      $height={height}
      $margin={margin}
      tabIndex={-1}
      $isPrivate={isPrivate}
    >
      <CardImageWrapper>
        {isDraft ? <DraftText data-testid="draft-text">{draftText}</DraftText> : null}
        {url && isViewableImage
          ? <CardImage className="CardImage" loading="lazy" src={url} alt={text} />
          : <CardFileIcon data-testid="card-file-icon">{type}</CardFileIcon>}
      </CardImageWrapper>
      <CardText>{text}</CardText>
      {formattedSize ? <CardFileSize data-testid="card-file-size">{formattedSize}</CardFileSize> : null}
    </Card>
  );
}

export default MediaLibraryCard;
