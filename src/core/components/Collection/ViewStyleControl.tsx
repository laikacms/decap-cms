import React from 'react';
import styled from '@emotion/styled';

import { Icon, buttons, colors } from '../../../ui/default/index';
import { VIEW_STYLE_LIST, VIEW_STYLE_GRID } from '../../constants/collectionViews';

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

  ${Icon} {
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
        $isActive={viewStyle === VIEW_STYLE_LIST}
        onClick={() => onChangeViewStyle(VIEW_STYLE_LIST)}
      >
        <Icon type="list" />
      </ViewControlsButton>
      <ViewControlsButton
        aria-label={t('collection.collectionTop.viewAsGrid')}
        $isActive={viewStyle === VIEW_STYLE_GRID}
        onClick={() => onChangeViewStyle(VIEW_STYLE_GRID)}
      >
        <Icon type="grid" />
      </ViewControlsButton>
    </ViewControlsSection>
  );
}

export default ViewStyleControl;
