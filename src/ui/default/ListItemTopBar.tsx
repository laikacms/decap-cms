import React from 'react';
import styled from '@emotion/styled';

import Icon from './Icon';
import { colors, lengths, buttons } from './styles';

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  height: 26px;
  border-radius: ${lengths.borderRadius} ${lengths.borderRadius} 0 0;
  position: relative;
`;

const TopBarButton = styled.button`
  ${buttons.button};
  color: ${colors.controlLabel};
  background: transparent;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  width: 32px;
  text-align: center;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const TopBarButtonSpan = TopBarButton.withComponent('span');

const DragIconContainer = styled(TopBarButtonSpan)`
  width: 100%;
  cursor: move;
`;

interface DragHandleProps {
  Wrapper: React.ComponentType<{ id?: string; children: React.ReactNode }>;
  id?: string;
}

function DragHandle({ Wrapper, id }: DragHandleProps): React.ReactElement {
  return (
    <Wrapper id={id}>
      <DragIconContainer>
        <Icon type="drag-handle" size="small" />
      </DragIconContainer>
    </Wrapper>
  );
}

export interface ListItemTopBarProps {
  className?: string;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onRemove?: () => void;
  allowRemove?: boolean;
  dragHandle?: React.ComponentType<{ id?: string; children: React.ReactNode }>;
  allowReorder?: boolean;
  id?: string;
}

function ListItemTopBar(props: ListItemTopBarProps): React.ReactElement {
  const {
    className,
    collapsed,
    onCollapseToggle,
    onRemove,
    allowRemove,
    dragHandle,
    allowReorder,
    id,
  } = props;
  return (
    <TopBar className={className}>
      {onCollapseToggle ? (
        <TopBarButton className="TopBarButton-button" onClick={onCollapseToggle}>
          <Icon type="chevron" size="small" direction={collapsed ? 'right' : 'down'} />
        </TopBarButton>
      ) : null}
      {dragHandle && allowReorder ? <DragHandle Wrapper={dragHandle} id={id} /> : <span></span>}
      {onRemove && allowRemove ? (
        <TopBarButton className="TopBarButton-button" onClick={onRemove}>
          <Icon type="close" size="small" />
        </TopBarButton>
      ) : (
        <span></span>
      )}
    </TopBar>
  );
}

const StyledListItemTopBar = styled(ListItemTopBar)`
  display: flex;
  justify-content: space-between;
  height: 26px;
  border-radius: ${lengths.borderRadius} ${lengths.borderRadius} 0 0;
  position: relative;
`;

export default StyledListItemTopBar;
