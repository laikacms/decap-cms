import styled from '@emotion/styled';
import React from 'react';

import { colors, text } from '@/ui/default/index';
import { defaultShouldForwardProp } from '@/ui/styled';

import type { CmsEntryField } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

function isVisible(field: CmsEntryField) {
  return field.widget !== 'hidden';
}

/**
 * Object-widget fields nest their child field schema under either `fields`
 * (multiple) or `field` (single) — see the `object` widget's ObjectControl.
 * Other widgets (e.g. `list`) also expose child field schemas, but their
 * rendered instances are runtime/value-dependent (one subtree per list
 * item), so there's no static path to jump to and we intentionally don't
 * recurse into them here.
 */
function getNestedFields(field: CmsEntryField): CmsEntryField[] | null {
  if (field.widget !== 'object') return null;
  const nested = field.fields ?? (field.field ? [field.field] : undefined);
  if (!nested || nested.length === 0) return null;
  return nested;
}

export function buildFieldPath(parentPath: string, field: CmsEntryField): string {
  const name = field.name;
  return parentPath ? `${parentPath}.${name}` : name;
}

export interface NavigableField {
  path: string;
  label: string;
  depth: number;
}

/**
 * Flattens `fields` into the same top-level + object-recursed set of entries
 * the panel renders, keyed by the dotted path `EditorControlPane`'s
 * `focus(path)` handle understands (DCMS-1423's click-to-jump plumbing,
 * already reused by the preview pane).
 */
export function flattenNavigableFields(
  fields: CmsEntryField[] | undefined,
  parentPath = '',
  depth = 0,
): NavigableField[] {
  if (!fields) return [];
  return fields.filter(isVisible).flatMap(field => {
    const path = buildFieldPath(parentPath, field);
    const label = (field.label as string | undefined) || field.name;
    const nested = getNestedFields(field);
    return [
      { path, label, depth },
      ...flattenNavigableFields(nested ?? undefined, path, depth + 1),
    ];
  });
}

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

interface NavItemButtonProps {
  $depth: number;
  $active: boolean;
}

const NavItemButton = styled('button', { shouldForwardProp: defaultShouldForwardProp })<NavItemButtonProps>`
  display: block;
  width: 100%;
  text-align: left;
  background: ${(props: NavItemButtonProps) => (props.$active ? colors.textFieldBorder : 'none')};
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  padding-left: ${(props: NavItemButtonProps) => 8 + props.$depth * 12}px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: ${(props: NavItemButtonProps) => (props.$active ? 600 : 400)};
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

interface FieldNavigatorItemProps {
  field: CmsEntryField;
  parentPath: string;
  depth: number;
  activeFieldPath?: string | undefined;
  onFieldClick: (path: string) => void;
}

function FieldNavigatorItem({ field, parentPath, depth, activeFieldPath, onFieldClick }: FieldNavigatorItemProps) {
  const label = (field.label as string | undefined) || field.name;
  const path = buildFieldPath(parentPath, field);
  const nestedFields = getNestedFields(field)?.filter(isVisible) ?? [];
  const isActive = path === activeFieldPath;

  return (
    <li>
      <NavItemButton
        type="button"
        $depth={depth}
        $active={isActive}
        title={label}
        aria-current={isActive ? 'true' : undefined}
        onClick={() => onFieldClick(path)}
      >
        {label}
      </NavItemButton>
      {nestedFields.length > 0 && (
        <NavList>
          {nestedFields.map((childField, idx) => (
            <FieldNavigatorItem
              key={childField.name || idx}
              field={childField}
              parentPath={path}
              depth={depth + 1}
              activeFieldPath={activeFieldPath}
              onFieldClick={onFieldClick}
            />
          ))}
        </NavList>
      )}
    </li>
  );
}

export interface EditorFieldNavigatorProps {
  fields: CmsEntryField[] | undefined;
  activeFieldPath?: string | undefined;
  onFieldClick: (path: string) => void;
  t: TranslateFunction;
}

function EditorFieldNavigator({ fields, activeFieldPath, onFieldClick, t }: EditorFieldNavigatorProps) {
  const visibleFields = (fields ?? []).filter(isVisible);
  if (visibleFields.length === 0) return null;

  return (
    <Nav aria-label={t('editor.editorFieldNavigator.title')}>
      <NavHeading>{t('editor.editorFieldNavigator.title')}</NavHeading>
      <NavList>
        {visibleFields.map((field, idx) => (
          <FieldNavigatorItem
            key={field.name || idx}
            field={field}
            parentPath=""
            depth={0}
            activeFieldPath={activeFieldPath}
            onFieldClick={onFieldClick}
          />
        ))}
      </NavList>
    </Nav>
  );
}

export default EditorFieldNavigator;
