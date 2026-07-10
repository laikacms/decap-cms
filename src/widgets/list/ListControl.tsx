/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { css, ClassNames } from '@emotion/react';
import isEmpty from 'lodash/isEmpty';
import memoize from 'lodash/memoize';
import uniqueId from 'lodash/uniqueId';
import { v4 as uuid } from 'uuid';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { get, isObject, omit, set } from 'lodash';

import {
  ListItemTopBar,
  ObjectWidgetTopBar,
  colors,
  lengths,
  FieldLabel,
} from '../../ui/default/index';
import { stringTemplate, validations } from '../../lib/widgets/index';
import DecapCmsWidgetObject from '../object/index';
import {
  TYPES_KEY,
  getTypedFieldForValue,
  resolveFieldKeyType,
  getErrorMessageForTypedFieldAndValue,
} from './typedListHelpers';

import type {
  CmsEntry,
  CmsField,
  CmsFieldBase,
  CmsFieldList,
  CmsFieldObject,
  TranslateFunction,
} from '../../lib/util/index';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ComponentType } from 'react';

interface WidgetControlRef {
  props: { field: CmsFieldBase & CmsFieldList };
  validate?: () => void;
  focus?: (path: string) => void;
  innerWrappedControl?: {
    validate?: () => void;
  };
}

const ObjectControl = DecapCmsWidgetObject.controlComponent;

const ListItem = styled.div();

const StyledListItemTopBar = styled(ListItemTopBar)`
  background-color: ${colors.textFieldBorder};
`;

interface NestedObjectLabelProps {
  collapsed?: boolean;
  error?: boolean;
}

const NestedObjectLabel = styled.div<NestedObjectLabelProps>`
  display: ${(props: NestedObjectLabelProps) => (props.collapsed ? 'block' : 'none')};
  border-top: 0;
  color: ${(props: NestedObjectLabelProps) => (props.error ? colors.errorText : 'inherit')};
  background-color: ${colors.textFieldBorder};
  padding: 13px;
  border-radius: 0 0 ${lengths.borderRadius} ${lengths.borderRadius};
`;

const styleStrings = {
  collapsedObjectControl: `
    display: none;
  `,
  objectWidgetTopBarContainer: `
    padding: ${lengths.objectWidgetTopBarContainerPadding};
  `,
};

const styles = {
  listControlItem: css`
    margin-top: 18px;

    &:first-of-type {
      margin-top: 26px;
    }
  `,
  listControlItemCollapsed: css`
    padding-bottom: 0;
  `,
};

interface SortableListProps {
  items: Array<{ id: string }>;
  children: React.ReactNode;
  onSortEnd: (args: { oldIndex: number; newIndex: number }) => void;
  keys: string[];
}

function SortableList({ items, children, onSortEnd, keys }: SortableListProps) {
  const activationConstraint = { distance: 4 };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
  );

  function handleSortEnd({ active, over }: DragEndEvent) {
    onSortEnd({
      oldIndex: keys.indexOf(active.id as string),
      newIndex: keys.indexOf(over?.id as string),
    });
  }

  return (
    <div>
      <DndContext
        modifiers={[restrictToParentElement]}
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragEnd={handleSortEnd}
      >
        <SortableContext items={items}>{children}</SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableListItemProps {
  id: string;
  index: number;
  collapsed?: boolean;
  children: React.ReactNode;
  keys?: string[];
  css?: unknown;
}

function SortableListItem(props: SortableListItemProps) {
  const { setNodeRef, transform, transition } = useSortable({
    id: props.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { collapsed } = props;

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      className="SortableListItem"
      css={[styles.listControlItem, collapsed && styles.listControlItemCollapsed]}
    >
      {props.children}
    </ListItem>
  );
}

interface DragHandleProps {
  children: React.ReactNode;
  id?: string;
}

function DragHandle({ children, id }: DragHandleProps) {
  const { attributes, listeners } = useSortable({
    id: id ?? '',
  });

  return (
    <div {...attributes} {...listeners}>
      {children}
    </div>
  );
}

const valueTypes = {
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
  MIXED: 'MIXED',
};

function handleSummary(
  summary: string,
  entry: CmsEntry,
  label: string,
  item: Record<string, string>,
): string {
  set(item, 'fields.label', label);
  const data = stringTemplate.addFileTemplateFields(entry.path, item);
  return stringTemplate.compileStringTemplate(summary, null, '', data);
}

function validateItem(field: CmsField, item: unknown): boolean {
  if (!isObject(item)) {
    console.warn(
      `'${field.name}' field item value value should be an object but is a '${typeof item}'`,
    );
    return false;
  }
  return true;
}

interface LabelComponentProps {
  field: CmsField;
  isActive: boolean;
  hasErrors: boolean | undefined;
  uniqueFieldId: string;
  isFieldOptional: boolean;
  t: TranslateFunction;
}

function LabelComponent({
  field,
  isActive,
  hasErrors,
  uniqueFieldId,
  isFieldOptional,
  t,
}: LabelComponentProps) {
  const label = `${field.label ?? field.name}`;
  return (
    <FieldLabel $isActive={isActive} $hasErrors={hasErrors} htmlFor={uniqueFieldId}>
      {label} {`${isFieldOptional ? ` (${t?.('editor.editorControl.field.optional') ?? ''})` : ''}`}
    </FieldLabel>
  );
}

interface TypeItem {
  name: string;
  label?: string;
}

export interface ListControlProps {
  metadata?: Record<string, Record<string, unknown>>;
  onChange: (value: unknown[], metadata?: Record<string, unknown>) => void;
  onChangeObject: (
    field: CmsField,
    newValue: unknown,
    newMetadata?: Record<string, unknown>,
  ) => void;
  onValidateObject: (
    fieldId: string | CmsField,
    errors: Array<{ type: string; message: string }>,
  ) => void;
  validate: () => void;
  value?: unknown[] | unknown;
  field: CmsFieldBase & CmsFieldList;
  forID: string;
  controlRef?: (ref: WidgetControlRef | null) => void;
  mediaPaths: Record<string, string>;
  getAsset: (
    path: string,
    field: CmsField,
  ) => { toString: () => string; url: string; path: string };
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  onAddAsset: (asset: unknown) => void;
  onRemoveInsertedMedia: (controlID: string) => void;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  editorControl: ComponentType<Record<string, unknown>>;
  resolveWidget: (name: string) => Record<string, unknown>;
  clearFieldErrors: (fieldId: string | undefined) => void;
  fieldsErrors: Record<string, Array<{ type: string; message: string; parentIds?: string[] }>>;
  entry: CmsEntry;
  t: TranslateFunction;
  parentIds?: string[];
}

export interface ListControlHandle {
  validate(): void;
  focus(path: string): void;
}

type ChildRef = any;

function valueToString(value: unknown, fieldName: string): string {
  let stringValue;
  if (Array.isArray(value)) {
    stringValue = value.join(',');
  } else {
    console.warn(
      `Expected List value to be an array but received '${value}' with type of '${typeof value}'. Please check the value provided to the '${fieldName}' field`,
    );
    stringValue = String(value);
  }
  return stringValue.replace(/,([^\s]|$)/g, ', $1');
}

function getFieldsDefault(
  fields: any,
  initialValue: Record<string, unknown> = {},
): Record<string, unknown> {
  return fields.reduce((acc: Record<string, unknown>, item: any) => {
    const subfields = item.field || item.fields;
    const object = item.widget == 'object';
    const name = item.name;
    const defaultValue = item.default ?? null;

    if (Array.isArray(subfields) && object) {
      const subDefaultValue = getFieldsDefault(subfields);
      if (!isEmpty(subDefaultValue)) {
        acc[name] = subDefaultValue;
      }
      return acc;
    }

    if (isObject(subfields) && object) {
      const subDefaultValue = getFieldsDefault([subfields]);
      if (!isEmpty(subDefaultValue)) {
        acc[name] = subDefaultValue;
      }
      return acc;
    }

    if (defaultValue !== null) {
      acc[name] = defaultValue;
    }

    return acc;
  }, initialValue);
}

const ListControl = React.forwardRef<ListControlHandle, ListControlProps>(
  function ListControl(props, ref) {
    const {
      field,
      value: inputValue = [],
      forID,
      classNameWrapper,
      editorControl,
      onValidateObject,
      metadata,
      clearFieldErrors,
      fieldsErrors,
      controlRef,
      resolveWidget,
      parentIds = [],
      entry,
      t,
      setActiveStyle,
      setInactiveStyle,
      onChange,
    } = props;

    const childRefs = React.useRef<Record<string, ChildRef>>({});
    const uniqueFieldIdRef = React.useRef<string>('');
    if (!uniqueFieldIdRef.current) {
      uniqueFieldIdRef.current = uniqueId(`${field.name}-field-`);
    }
    const uniqueFieldId = uniqueFieldIdRef.current;

    const initialArrayValue = Array.isArray(inputValue)
      ? inputValue
      : inputValue
        ? [inputValue]
        : [];
    const initialListCollapsed = field.collapsed ?? true;

    const [listCollapsed, setListCollapsed] = React.useState<boolean>(initialListCollapsed);
    const [itemsCollapsed, setItemsCollapsed] = React.useState<boolean[]>(
      () => initialArrayValue.map(() => initialListCollapsed) || [],
    );
    const [stringValue, setStringValue] = React.useState<string>(() =>
      valueToString(initialArrayValue, field.name),
    );
    const [keys, setKeys] = React.useState<string[]>(() => initialArrayValue.map(() => uuid()));

    function getValueType(): string | null {
      if (field.fields) return valueTypes.MULTIPLE;
      if (field.field) return valueTypes.SINGLE;
      if (field[TYPES_KEY]) return valueTypes.MIXED;
      return null;
    }

    function validateSize() {
      const value = Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
      const min = field.min;
      const max = field.max;
      const required = field.required ?? true;

      if (!required && !value?.length) {
        return [];
      }

      const error = validations.validateMinMax(
        t as (key: string, options: unknown) => string,
        field.label ?? field.name,
        value,
        min,
        max,
      );

      return error ? [error] : [];
    }

    // Latest state/props for the imperative handle so callers that captured the
    // handle once keep seeing the current value.
    const latestRef = React.useRef({
      listCollapsed,
      itemsCollapsed,
      keys,
      propsValidate: props.validate,
      onValidateObject,
      forID,
      getValueType,
      validateSize,
    });
    latestRef.current = {
      listCollapsed,
      itemsCollapsed,
      keys,
      propsValidate: props.validate,
      onValidateObject,
      forID,
      getValueType,
      validateSize,
    };

    // Pending focus for after a setState-triggered re-render expanded the items.
    const pendingFocusRef = React.useRef<{ index: number; remainingPath: string } | null>(null);

    React.useImperativeHandle(
      ref,
      () => ({
        validate() {
          const hasChildWidgets =
            latestRef.current.getValueType() && Object.keys(childRefs.current).length > 0;
          if (hasChildWidgets) {
            Object.values(childRefs.current).forEach((widget: ChildRef) => {
              widget?.validate?.();
            });
          } else {
            latestRef.current.propsValidate();
          }
          latestRef.current.onValidateObject(
            latestRef.current.forID,
            latestRef.current.validateSize(),
          );
        },
        focus(path: string) {
          const [indexStr, ...remainingPath] = path.split('.');
          const index = Number(indexStr);
          const { listCollapsed: lc, itemsCollapsed: ic, keys: ks } = latestRef.current;

          if (lc || ic[index]) {
            // Defer focus until after expansion renders.
            pendingFocusRef.current = { index, remainingPath: remainingPath.join('.') };
            setListCollapsed(false);
            setItemsCollapsed(prev => {
              const next = [...prev];
              next[index] = false;
              return next;
            });
          } else {
            const key = ks[index];
            const control = childRefs.current[key];
            control?.focus?.(remainingPath.join('.'));
          }
        },
      }),
      [],
    );

    // Apply pending focus after items expand.
    React.useEffect(() => {
      const pending = pendingFocusRef.current;
      if (!pending) return;
      if (listCollapsed || itemsCollapsed[pending.index]) return;
      pendingFocusRef.current = null;
      const key = keys[pending.index];
      const control = childRefs.current[key];
      control?.focus?.(pending.remainingPath);
    }, [listCollapsed, itemsCollapsed, keys]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const oldValue = stringValue;
      const newValue = e.target.value.trim();
      const listValue = newValue ? newValue.split(',') : [];
      if (newValue.match(/,$/) && oldValue.match(/, $/)) {
        listValue.pop();
      }

      const parsedValue = valueToString(listValue, field.name);
      setStringValue(parsedValue);
      onChange(listValue.map((val: string) => val.trim()));
    }

    function handleFocus() {
      setActiveStyle();
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      const listValue = e.target.value
        .split(',')
        .map((el: string) => el.trim())
        .filter((el: string) => el);
      setStringValue(valueToString(listValue, field.name));
      setInactiveStyle();
    }

    function singleDefault() {
      return get(field, ['field', 'default'], null);
    }

    function multipleDefault(fields: unknown) {
      return getFieldsDefault(fields);
    }

    function mixedDefault(typeKey: string, type: string) {
      const selectedType = (field[TYPES_KEY] as CmsField[]).find(
        (f: CmsField) => f.name === type,
      ) as CmsField & { fields?: CmsField[] | unknown; field?: CmsField | unknown };
      const fields = selectedType?.fields || [selectedType?.field];
      return getFieldsDefault(fields, { [typeKey]: type });
    }

    function addItem(parsedValue: unknown) {
      const addToTop = field.add_to_top ?? false;
      const itemKey = uuid();
      setItemsCollapsed(prev => (addToTop ? [false, ...prev] : [...prev, false]));
      setKeys(prev => (addToTop ? [itemKey, ...prev] : [...prev, itemKey]));

      const listValue = Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
      if (addToTop) {
        onChange([parsedValue, ...listValue]);
      } else {
        onChange([...listValue, parsedValue]);
      }
    }

    function handleAdd(e: React.MouseEvent) {
      e.preventDefault();
      const parsedValue =
        getValueType() === valueTypes.SINGLE ? singleDefault() : multipleDefault(field.fields);
      addItem(parsedValue);
    }

    function handleAddType(type: string, typeKey: string) {
      addItem(mixedDefault(typeKey, type));
    }

    function processControlRef(itemKey: string) {
      return (childRef: ChildRef) => {
        if (!childRef) return;
        childRefs.current[itemKey] = childRef;
      };
    }

    function getObjectValue(idx: number) {
      return ((inputValue as unknown[])[idx] || {}) as Record<string, unknown>;
    }

    const handleChangeFor = React.useMemo(
      () =>
        memoize((index: number) => {
          return (f: CmsField, newValue: unknown, newMetadata: Record<string, unknown>) => {
            const value = Array.isArray(inputValue)
              ? [...inputValue]
              : inputValue
                ? [inputValue]
                : [];
            const collectionName = field.name;
            const isListFieldObjectWidget = get(field, ['field', 'widget']) === 'object';
            const withNameKey =
              getValueType() !== valueTypes.SINGLE ||
              (getValueType() === valueTypes.SINGLE && isListFieldObjectWidget);
            let newObjectValue;
            if (withNameKey) {
              const name = f.name;
              const ov = { ...getObjectValue(index) };
              ov[name] = newValue;
              newObjectValue = ov;
            } else {
              newObjectValue = newValue;
            }
            const parsedMetadata = {
              [collectionName]: { ...(metadata ?? {}), ...(newMetadata || {}) },
            };

            value[index] = newObjectValue;
            onChange(value, parsedMetadata);
          };
        }),
      // Recreate when value identity changes so closures see latest value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [inputValue, metadata, field, onChange],
    );

    function handleRemove(index: number, event: React.MouseEvent) {
      event.preventDefault();
      const collectionName = field.name;
      const isSingleField = getValueType() === valueTypes.SINGLE;
      const value =
        inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];

      const val = { ...value };
      const metadataRemovePath = isSingleField ? val[index] : Object.values(val[index]);
      const parsedMetadata =
        metadata && !isEmpty(metadata)
          ? {
              [collectionName]: omit(metadata, ...metadataRemovePath),
            }
          : metadata;

      const removedKey = keys[index];

      const newKeys = [...keys];
      newKeys.splice(index, 1);
      const newItemsCollapsed = [...itemsCollapsed];
      newItemsCollapsed.splice(index, 1);

      setItemsCollapsed(newItemsCollapsed);
      setKeys(newKeys);

      delete childRefs.current[removedKey];

      const newValue = value.filter((_: unknown, i: number) => i !== index);

      if (fieldsErrors) {
        Object.entries(fieldsErrors).forEach(([fieldId, errors]: [string, any]) => {
          if (errors.some((err: any) => err.parentIds?.includes(removedKey))) {
            clearFieldErrors(fieldId);
          }
        });
      }

      if (newValue.length === 0) {
        clearFieldErrors(forID);
        onValidateObject(forID, []);
      }

      onChange(newValue, parsedMetadata);
    }

    function handleItemCollapseToggle(index: number, event: React.MouseEvent) {
      event.preventDefault();
      setItemsCollapsed(prev =>
        prev.map((collapsed: boolean, i: number) => (i === index ? !collapsed : collapsed)),
      );
    }

    function handleCollapseAllToggle(e: React.MouseEvent) {
      e.preventDefault();
      const value =
        inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
      const minimizeCollapsedItems = field.minimize_collapsed ?? false;
      const listCollapsedByDefault = field.collapsed ?? true;
      const allItemsCollapsed = itemsCollapsed.every((val: boolean) => val === true);

      if (minimizeCollapsedItems) {
        let updatedItemsCollapsed = itemsCollapsed;
        if (!listCollapsed || !listCollapsedByDefault) {
          updatedItemsCollapsed = Array(value.length).fill(!listCollapsed);
        }
        setListCollapsed(prev => !prev);
        setItemsCollapsed(updatedItemsCollapsed);
      } else {
        setItemsCollapsed(Array(value.length).fill(!allItemsCollapsed));
      }
    }

    function objectLabel(item: unknown) {
      const valueType = getValueType();
      switch (valueType) {
        case valueTypes.MIXED: {
          if (!validateItem(field, item)) return;
          const itemType = getTypedFieldForValue(field, item);
          const label = itemType?.label ?? itemType?.name ?? '';
          const summary = get(itemType, 'summary', field?.summary);
          return summary
            ? handleSummary(summary, entry, label, item as Record<string, string>)
            : label;
        }
        case valueTypes.SINGLE: {
          const singleField = field.field;
          const label = singleField?.label ?? singleField?.name ?? '';
          const summary = field?.summary;
          const data = { [singleField?.name ?? '']: item as string };
          return summary ? handleSummary(summary, entry, label, data) : label;
        }
        case valueTypes.MULTIPLE: {
          if (!validateItem(field, item)) return;
          const multiFields = field.fields;
          const labelField = multiFields && multiFields?.[0];
          const value = get(item, labelField?.name ?? '', '');
          const summary = field?.summary;
          const labelReturn = summary
            ? handleSummary(summary, entry, value, item as Record<string, string>)
            : value;
          return (labelReturn || `No ${labelField?.name}`).toString();
        }
      }
      return '';
    }

    function onSortEnd({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) {
      const value =
        inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];

      const val = { ...value };
      const item = val[oldIndex];
      val.splice(oldIndex, 1);
      val.splice(newIndex, 0, item);
      onChange(val);

      const collapsed = itemsCollapsed[oldIndex];
      const next = [...itemsCollapsed];
      next.splice(oldIndex, 1);
      const updatedItemsCollapsed = [...next];
      updatedItemsCollapsed.splice(newIndex, 0, collapsed);

      const movedKey = keys[oldIndex];
      const updatedKeys = [...keys];
      updatedKeys.splice(oldIndex, 1);
      updatedKeys.splice(newIndex, 0, movedKey);

      setItemsCollapsed(updatedItemsCollapsed);
      setKeys(updatedKeys);
    }

    function hasError(index: number) {
      if (fieldsErrors && !isEmpty(fieldsErrors)) {
        return Object.values(fieldsErrors).some((arr: any) =>
          arr.some((err: any) => err.parentIds && err.parentIds.includes(keys[index])),
        );
      }
    }

    const getStableParentIds = React.useMemo(
      () =>
        memoize(
          (parentIdsArr: string[], forIDArg: string | undefined, key: string) => [
            ...parentIdsArr,
            forIDArg ?? '',
            key,
          ],
          (parentIdsArr: string[], forIDArg: string | undefined, key: string) =>
            JSON.stringify([...parentIdsArr, forIDArg, key]),
        ),
      [],
    );

    function renderItem(item: unknown, index: number) {
      const collapsed = itemsCollapsed[index];
      const key = keys[index];
      let f: CmsField | undefined = field;
      const itemHasError = hasError(index);
      const isVariableTypesList = getValueType() === valueTypes.MIXED;
      if (isVariableTypesList) {
        f = getTypedFieldForValue(f!, item);
        if (!f) {
          return renderErroneousTypedItem(index, item);
        }
      }

      return (
        <SortableListItem
          css={[styles.listControlItem, collapsed && styles.listControlItemCollapsed]}
          index={index}
          key={key}
          id={key}
          keys={keys}
        >
          {isVariableTypesList && (
            <LabelComponent
              field={f!}
              isActive={false}
              hasErrors={itemHasError}
              uniqueFieldId={uniqueFieldId}
              isFieldOptional={f.required === false}
              t={t}
            />
          )}
          <StyledListItemTopBar
            collapsed={collapsed}
            onCollapseToggle={() =>
              handleItemCollapseToggle(index, { preventDefault: () => {} } as React.MouseEvent)
            }
            dragHandle={DragHandle}
            id={key}
            allowRemove={f!.allow_remove ?? true}
            allowReorder={f!.allow_reorder ?? true}
            onRemove={() => handleRemove(index, { preventDefault: () => {} } as React.MouseEvent)}
            data-testid={`styled-list-item-top-bar-${key}`}
          />
          <NestedObjectLabel
            className="NestedObjectLabel"
            collapsed={collapsed}
            error={itemHasError}
          >
            {objectLabel(item)}
          </NestedObjectLabel>
          <ClassNames>
            {({ css: cn, cx }) => (
              <ObjectControl
                classNameWrapper={cx(classNameWrapper, {
                  [cn`
                  ${styleStrings.collapsedObjectControl};
                `]: collapsed,
                })}
                value={item as Record<string, unknown>}
                field={f as CmsFieldObject & CmsFieldBase}
                onChangeObject={handleChangeFor(index) as (...args: unknown[]) => unknown}
                editorControl={editorControl}
                resolveWidget={resolveWidget}
                metadata={metadata}
                forList
                onValidateObject={onValidateObject}
                clearFieldErrors={clearFieldErrors}
                fieldsErrors={fieldsErrors}
                ref={processControlRef(key)}
                controlRef={controlRef as any}
                t={t}
                collapsed={collapsed}
                data-testid={`object-control-${key}`}
                hasError={itemHasError}
                parentIds={getStableParentIds(parentIds, forID, key)}
              />
            )}
          </ClassNames>
        </SortableListItem>
      );
    }

    function renderErroneousTypedItem(index: number, item: unknown) {
      const errorMessage = getErrorMessageForTypedFieldAndValue(
        field,
        item as Record<string, unknown>,
      );
      const key = `item-${index}`;
      return (
        <SortableListItem
          css={[styles.listControlItem, styles.listControlItemCollapsed]}
          index={index}
          key={key}
          id={key}
        >
          <StyledListItemTopBar
            onCollapseToggle={undefined}
            onRemove={() => handleRemove(index, { preventDefault: () => {} } as React.MouseEvent)}
            dragHandle={DragHandle}
            id={key}
          />
          <NestedObjectLabel className="NestedObjectLabel" collapsed={true} error={true}>
            {errorMessage}
          </NestedObjectLabel>
        </SortableListItem>
      );
    }

    function renderListControl() {
      const value =
        inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
      const items = value || [];
      const label = field.label ?? field.name;
      const labelSingular = field.label_singular ?? field.label ?? field.name;
      const listLabel = items.length === 1 ? labelSingular.toLowerCase() : label.toLowerCase();
      const minimizeCollapsedItems = field.minimize_collapsed ?? false;
      const allItemsCollapsed = itemsCollapsed.every((val: boolean) => val === true);
      const selfCollapsed = allItemsCollapsed && (listCollapsed || !minimizeCollapsedItems);

      const itemsArray = keys.map((key: string) => ({ id: key }));

      return (
        <ClassNames>
          {({ cx, css: cn }) => (
            <div
              id={forID}
              className={cx(
                classNameWrapper,
                cn`
                ${styleStrings.objectWidgetTopBarContainer}
              `,
              )}
            >
              <ObjectWidgetTopBar
                allowAdd={field.allow_add ?? true}
                onAdd={() => handleAdd({ preventDefault: () => {} } as React.MouseEvent)}
                types={field[TYPES_KEY] as unknown as TypeItem[]}
                onAddType={(type: string) => handleAddType(type, resolveFieldKeyType(field))}
                heading={`${items.length} ${listLabel}`}
                label={labelSingular.toLowerCase()}
                onCollapseToggle={() =>
                  handleCollapseAllToggle({ preventDefault: () => {} } as React.MouseEvent)
                }
                collapsed={selfCollapsed}
                t={t!}
              />
              {(!selfCollapsed || !minimizeCollapsedItems) && (
                <SortableList items={itemsArray} keys={keys} onSortEnd={onSortEnd}>
                  {items.map(renderItem)}
                </SortableList>
              )}
            </div>
          )}
        </ClassNames>
      );
    }

    function renderInput() {
      return (
        <input
          type="text"
          id={forID}
          value={stringValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={classNameWrapper}
        />
      );
    }

    if (getValueType() !== null) {
      return renderListControl();
    }
    return renderInput();
  },
);

export default ListControl;
