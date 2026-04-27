import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { colors, borders, lengths, shadows, effects } from 'decap-cms-ui-default';

const IMAGE_HEIGHT = 160;

interface CardStyleProps {
  $width: string;
  $height: string;
  $margin: string;
  $isSelected?: boolean;
  $isPrivate?: boolean;
}

const Card = styled.div<CardStyleProps>`
  width: ${props => props.$width};
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

const DraftText = styled.p`
  color: ${colors.mediaDraftText};
  background-color: ${colors.mediaDraftBackground};
  position: absolute;
  padding: 8px;
  border-radius: ${lengths.borderRadius} 0 ${lengths.borderRadius} 0;
`;

interface MediaLibraryCardProps {
  isSelected?: boolean;
  displayURL: Record<string, unknown>;
  text: string;
  onClick: () => void;
  draftText: string;
  width: string;
  height: string;
  margin: string;
  isPrivate?: boolean;
  type?: string;
  isViewableImage: boolean;
  loadDisplayURL: () => void;
  isDraft?: boolean;
}

class MediaLibraryCard extends React.Component<MediaLibraryCardProps> {
  render() {
    const {
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
      isDraft,
    } = this.props;
    const url = displayURL['url'] as string | undefined;
    return (
      <Card
        $isSelected={isSelected}
        onClick={onClick}
        $width={width}
        $height={height}
        $margin={margin}
        tabIndex={-1}
        $isPrivate={isPrivate}
      >
        <CardImageWrapper>
          {isDraft ? <DraftText data-testid="draft-text">{draftText}</DraftText> : null}
          {url && isViewableImage ? (
            <CardImage loading="lazy" src={url} />
          ) : (
            <CardFileIcon data-testid="card-file-icon">{type}</CardFileIcon>
          )}
        </CardImageWrapper>
        <CardText>{text}</CardText>
      </Card>
    );
  }
  componentDidMount() {
    const { displayURL, loadDisplayURL } = this.props;
    if (!displayURL['url']) {
      loadDisplayURL();
    }
  }
}

MediaLibraryCard.propTypes = {
  isSelected: PropTypes.bool,
  displayURL: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  draftText: PropTypes.string.isRequired,
  width: PropTypes.string.isRequired,
  height: PropTypes.string.isRequired,
  margin: PropTypes.string.isRequired,
  isPrivate: PropTypes.bool,
  type: PropTypes.string,
  isViewableImage: PropTypes.bool.isRequired,
  loadDisplayURL: PropTypes.func.isRequired,
  isDraft: PropTypes.bool,
};

export default MediaLibraryCard;
