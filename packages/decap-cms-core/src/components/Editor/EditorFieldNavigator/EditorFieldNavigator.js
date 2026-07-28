import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { List } from 'immutable';
import styled from '@emotion/styled';
import { colors, text } from 'decap-cms-ui-default';

import { isVisible } from '../../../lib/widgets';

const Nav = styled.nav`
  padding: 12px 8px 24px;
`;

const NavHeading = styled.div`
  ${text.fieldLabel};
  padding: 4px 8px 8px;
`;

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const NavItemButton = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  padding-left: ${props => 8 + props.depth * 12}px;
  border-radius: 4px;
  font-size: 14px;
  color: ${colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover,
  &:focus {
    background-color: ${colors.textFieldBorder};
    outline: none;
  }
`;

/**
 * Object-widget fields nest their child field schema under either `fields`
 * (multiple) or `field` (single) — see decap-cms-widget-object's
 * ObjectControl. Other widgets (e.g. `list`) also expose child field
 * schemas, but their rendered instances are runtime/value-dependent (one
 * subtree per list item), so we don't have a static path to jump to and
 * intentionally don't recurse into them here.
 */
function getNestedFields(field) {
  if (field.get('widget') !== 'object') {
    return null;
  }
  const nested = field.get('fields') || field.get('field');
  if (!nested) {
    return null;
  }
  return List.isList(nested) ? nested : List([nested]);
}

export function buildFieldPath(parentPath, field) {
  const name = field.get('name');
  return parentPath ? `${parentPath}.${name}` : name;
}

function FieldNavigatorItem({ field, parentPath, depth, onFieldClick }) {
  const label = field.get('label') || field.get('name');
  const path = buildFieldPath(parentPath, field);
  const nestedFields = getNestedFields(field);

  return (
    <li>
      <NavItemButton type="button" depth={depth} title={label} onClick={() => onFieldClick(path)}>
        {label}
      </NavItemButton>
      {nestedFields && nestedFields.filter(isVisible).size > 0 && (
        <NavList>
          {nestedFields.filter(isVisible).map((childField, idx) => (
            <FieldNavigatorItem
              key={childField.get('name') || idx}
              field={childField}
              parentPath={path}
              depth={depth + 1}
              onFieldClick={onFieldClick}
            />
          ))}
        </NavList>
      )}
    </li>
  );
}

FieldNavigatorItem.propTypes = {
  field: ImmutablePropTypes.map.isRequired,
  parentPath: PropTypes.string,
  depth: PropTypes.number.isRequired,
  onFieldClick: PropTypes.func.isRequired,
};

FieldNavigatorItem.defaultProps = {
  parentPath: '',
};

function EditorFieldNavigator({ fields, onFieldClick, t }) {
  if (!fields || fields.filter(isVisible).size === 0) {
    return null;
  }

  return (
    <Nav aria-label={t('editor.editorFieldNavigator.title')}>
      <NavHeading>{t('editor.editorFieldNavigator.title')}</NavHeading>
      <NavList>
        {fields.filter(isVisible).map((field, idx) => (
          <FieldNavigatorItem
            key={field.get('name') || idx}
            field={field}
            parentPath=""
            depth={0}
            onFieldClick={onFieldClick}
          />
        ))}
      </NavList>
    </Nav>
  );
}

EditorFieldNavigator.propTypes = {
  fields: ImmutablePropTypes.list,
  onFieldClick: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default EditorFieldNavigator;
