import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

import Icon from './Icon';
import { colors, buttons } from './styles';
import Dropdown, { StyledDropdownButton, DropdownItem } from './Dropdown';

const TopBarContainer = styled.div`
  align-items: center;
  background-color: ${colors.textFieldBorder};
  display: flex;
  justify-content: space-between;
  margin: 0 -14px;
  padding: 13px;
`;

interface ExpandButtonContainerProps {
  hasHeading?: boolean;
}

const ExpandButtonContainer = styled.div<ExpandButtonContainerProps>`
  ${(props: ExpandButtonContainerProps) =>
    props.hasHeading &&
    css`
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
    `};
`;

const ExpandButton = styled.button`
  ${buttons.button};
  padding: 4px;
  background-color: transparent;
  color: inherit;

  &:last-of-type {
    margin-right: 4px;
  }
`;

const AddButton = styled.button`
  ${buttons.button}
  ${buttons.widget}

  ${Icon} {
    margin-left: 6px;
  }
`;

export interface TranslateFunction {
  (key: string, options?: Record<string, unknown>): string;
}

export interface TypeItem {
  name: string;
  label?: string;
}

export interface ObjectWidgetTopBarProps {
  allowAdd?: boolean;
  types?: TypeItem[];
  onAdd?: () => void;
  onAddType?: (typeName: string) => void;
  onCollapseToggle?: () => void;
  collapsed?: boolean;
  heading?: React.ReactNode;
  label?: string;
  t: TranslateFunction;
}

function ObjectWidgetTopBar({
  allowAdd,
  types,
  onAdd,
  onAddType,
  onCollapseToggle,
  collapsed,
  heading = null,
  label,
  t,
}: ObjectWidgetTopBarProps) {
  let addUI: React.ReactNode = null;
  if (allowAdd) {
    if (types && types.length > 0) {
      addUI = (
        <Dropdown
          renderButton={() => (
            <StyledDropdownButton>
              {t('editor.editorWidgets.list.addType', { item: label })}
            </StyledDropdownButton>
          )}
        >
          {types.map((type: TypeItem, idx: number) => (
            <DropdownItem
              key={idx}
              label={type.label ?? type.name}
              onClick={() => onAddType?.(type.name)}
            />
          ))}
        </Dropdown>
      );
    } else {
      addUI = (
        <AddButton onClick={onAdd}>
          {t('editor.editorWidgets.list.add', { item: label })}
          <Icon type="add" size="xsmall" />
        </AddButton>
      );
    }
  }

  return (
    <TopBarContainer>
      <ExpandButtonContainer hasHeading={!!heading}>
        <ExpandButton
          onClick={onCollapseToggle}
          data-testid="expand-button"
          aria-label={
            collapsed
              ? t('editor.editorWidgets.object.expand')
              : t('editor.editorWidgets.object.collapse')
          }
        >
          <Icon type="chevron" direction={collapsed ? 'right' : 'down'} size="small" />
        </ExpandButton>
        {heading}
      </ExpandButtonContainer>
      {addUI}
    </TopBarContainer>
  );
}

export default ObjectWidgetTopBar;
