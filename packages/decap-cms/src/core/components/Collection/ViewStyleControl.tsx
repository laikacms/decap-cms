import styled from '@emotion/styled';
import React from 'react';

import { VIEW_STYLE_GRID, VIEW_STYLE_LIST } from '@/core/constants/collectionViews';
import { buttons, colors, Icon } from '@/ui/default/index';

const ViewControlsSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 500px;
`;

const ViewControlsButton = styled.button<{ $isActive?: boolean }>`
  ${buttons.button};
  color: ${props => (props.$isActive ? colors.active : '#b3b9c4')};
  background-color: transparent;
  display: block;
  padding: 0;
  margin: 0 4px;

  &:last-child {
    margin-right: 0;
  }

  .decap-icon {
    display: block;
  }
`;

interface ViewStyleControlProps {
  viewStyle: string;
  onChangeViewStyle: (style: string) => void;
  t: (key: string) => string;
}

function ViewStyleControl({ viewStyle, onChangeViewStyle, t }: ViewStyleControlProps) {
  return (
    <ViewControlsSection className="ViewControls">
      <ViewControlsButton
        aria-label={t('collection.collectionTop.viewAsList')}
        aria-pressed={viewStyle === VIEW_STYLE_LIST}
        $isActive={viewStyle === VIEW_STYLE_LIST}
        onClick={() => onChangeViewStyle(VIEW_STYLE_LIST)}
      >
        <Icon type="list" />
      </ViewControlsButton>
      <ViewControlsButton
        aria-label={t('collection.collectionTop.viewAsGrid')}
        aria-pressed={viewStyle === VIEW_STYLE_GRID}
        $isActive={viewStyle === VIEW_STYLE_GRID}
        onClick={() => onChangeViewStyle(VIEW_STYLE_GRID)}
      >
        <Icon type="grid" />
      </ViewControlsButton>
    </ViewControlsSection>
  );
}

export default ViewStyleControl;
