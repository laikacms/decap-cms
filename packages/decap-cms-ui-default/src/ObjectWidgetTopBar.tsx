import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { List } from 'immutable';

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
  get(key: 'label' | 'name', defaultValue?: string): string;
}

export interface ObjectWidgetTopBarProps {
  allowAdd?: boolean;
  types?: List<TypeItem>;
  onAdd?: () => void;
  onAddType?: (typeName: string) => void;
  onCollapseToggle?: () => void;
  collapsed?: boolean;
  heading?: React.ReactNode;
  label?: string;
  t: TranslateFunction;
}

class ObjectWidgetTopBar extends React.Component<ObjectWidgetTopBarProps> {
  renderAddUI(): React.ReactNode {
    if (!this.props.allowAdd) {
      return null;
    }
    if (this.props.types && this.props.types.size > 0) {
      return this.renderTypesDropdown(this.props.types);
    } else {
      return this.renderAddButton();
    }
  }

  renderTypesDropdown(types: List<TypeItem>): React.ReactElement {
    return (
      <Dropdown
        renderButton={() => (
          <StyledDropdownButton>
            {this.props.t('editor.editorWidgets.list.addType', { item: this.props.label })}
          </StyledDropdownButton>
        )}
      >
        {types.map((type: TypeItem, idx: number) => (
          <DropdownItem
            key={idx}
            label={type.get('label', type.get('name'))}
            onClick={() => this.props.onAddType?.(type.get('name'))}
          />
        ))}
      </Dropdown>
    );
  }

  renderAddButton(): React.ReactElement {
    return (
      <AddButton onClick={this.props.onAdd}>
        {this.props.t('editor.editorWidgets.list.add', { item: this.props.label })}
        <Icon type="add" size="xsmall" />
      </AddButton>
    );
  }

  render(): React.ReactElement {
    const { onCollapseToggle, collapsed, heading = null, t } = this.props;

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
        {this.renderAddUI()}
      </TopBarContainer>
    );
  }
}

export default ObjectWidgetTopBar;
