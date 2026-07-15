import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Collapsible } from '@base-ui/react/collapsible';

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
  // Renders the chevron as a Base UI Collapsible.Trigger, which requires an
  // enclosing Collapsible.Root; `onCollapseToggle` is ignored in that mode.
  collapsibleTrigger?: boolean;
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
  collapsibleTrigger,
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

  const toggleLabel = collapsed
    ? t('editor.editorWidgets.object.expand')
    : t('editor.editorWidgets.object.collapse');
  const chevron = <Icon type="chevron" direction={collapsed ? 'right' : 'down'} size="small" />;

  return (
    <TopBarContainer>
      <ExpandButtonContainer hasHeading={!!heading}>
        {collapsibleTrigger ? (
          <Collapsible.Trigger
            data-testid="expand-button"
            aria-label={toggleLabel}
            render={<ExpandButton />}
          >
            {chevron}
          </Collapsible.Trigger>
        ) : (
          <ExpandButton
            onClick={onCollapseToggle}
            data-testid="expand-button"
            aria-label={toggleLabel}
          >
            {chevron}
          </ExpandButton>
        )}
        {heading}
      </ExpandButtonContainer>
      {addUI}
    </TopBarContainer>
  );
}

export default ObjectWidgetTopBar;
