import { Collapsible } from '@base-ui/react/collapsible';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import Dropdown, { DropdownItem, StyledDropdownButton } from './Dropdown';
import Icon from './Icon';
import { buttons, colors } from './styles';

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
  props.hasHeading
  && css`
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

  .decap-icon {
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
  // The `id` of the associated Collapsible.Panel. Required when
  // `collapsibleTrigger` is set so the trigger can keep `aria-controls`
  // pointed at the panel even while collapsed (Base UI only emits
  // `aria-controls` when `open`, see DCMS-1725).
  panelId?: string;
  collapsed?: boolean | undefined;
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
  panelId,
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
        {collapsibleTrigger
          ? (
            <Collapsible.Trigger
              data-testid="expand-button"
              aria-label={toggleLabel}
              render={(triggerProps: React.ComponentPropsWithRef<'button'>) => (
                // Base UI's Collapsible.Trigger only sets `aria-controls` when
                // `open` is true; backfill it here so the trigger keeps
                // pointing at the panel while collapsed too (DCMS-1725).
                <ExpandButton
                  {...triggerProps}
                  aria-controls={triggerProps['aria-controls'] ?? panelId}
                />
              )}
            >
              {chevron}
            </Collapsible.Trigger>
          )
          : (
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
