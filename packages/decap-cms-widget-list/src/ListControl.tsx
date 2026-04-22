/** @jsxImportSource @emotion/react */
import type { ComponentType } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { css, ClassNames } from '@emotion/react';
import isEmpty from 'lodash/isEmpty';
import memoize from 'lodash/memoize';
import uniqueId from 'lodash/uniqueId';
import { v4 as uuid } from 'uuid';
import DecapCmsWidgetObject from 'decap-cms-widget-object';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  ListItemTopBar,
  ObjectWidgetTopBar,
  colors,
  lengths,
  FieldLabel,
} from 'decap-cms-ui-default';
import { stringTemplate, validations } from 'decap-cms-lib-widgets';

import {
  TYPES_KEY,
  getTypedFieldForValue,
  resolveFieldKeyType,
  getErrorMessageForTypedFieldAndValue,
} from './typedListHelpers';
import type { CmsEntry, CmsField, CmsFieldBase, CmsFieldList, CmsFieldObject } from 'decap-cms-lib-util/types/index';
import { get, isObject, omit, set } from 'lodash';

type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

/** Minimal shape for a widget control ref passed through controlRef */
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

function handleSummary(summary: string, entry: CmsEntry, label: string, item: Record<string, string>): string {
  set(item, 'fields.label', label);
  const data = stringTemplate.addFileTemplateFields(
    entry.path,
    item,
  );
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

function LabelComponent({ field, isActive, hasErrors, uniqueFieldId, isFieldOptional, t }: LabelComponentProps) {
  const label = `${field.label ?? field.name}`;
  return (
    <FieldLabel isActive={isActive} hasErrors={hasErrors} htmlFor={uniqueFieldId}>
      {label} {`${isFieldOptional ? ` (${t?.('editor.editorControl.field.optional') ?? ''})` : ''}`}
    </FieldLabel>
  );
}

interface TypeItem {
  get(key: 'label' | 'name', defaultValue?: string): string;
}

interface ListControlProps {
  /** Metadata for the field's collection, keyed by field name */
  metadata?: Record<string, Record<string, unknown>>;
  /** Called when the list value changes */
  onChange: (value: unknown[], metadata?: Record<string, unknown>) => void;
  /** Called when a nested object field changes (provided by Widget wrapper) */
  onChangeObject: (field: CmsField, newValue: unknown, newMetadata?: Record<string, unknown>) => void;
  /** Called to set validation errors for a specific field ID */
  onValidateObject: (fieldId: string | CmsField, errors: Array<{ type: string; message: string }>) => void;
  /** Triggers validation on this widget */
  validate: () => void;
  /** The current list value */
  value?: unknown[] | unknown;
  /** The field configuration (immutable map with name, label, fields, field, types, etc.) */
  field: CmsFieldBase & CmsFieldList;
  /** Unique field identifier used for validation and media paths */
  forID: string;
  /** Callback to register a ref for this control (used by parent for validation) */
  controlRef?: (ref: WidgetControlRef | null) => void;
  /** Map of media paths keyed by control ID */
  mediaPaths: Record<string, string>;
  /** Returns an asset proxy for a given path and field */
  getAsset: (path: string, field: CmsField) => { toString: () => string; url: string; path: string };
  /** Opens the media library with the given options */
  onOpenMediaLibrary: (options: Record<string, unknown>) => void;
  /** Adds an asset to the store */
  onAddAsset: (asset: unknown) => void;
  /** Removes inserted media for a given control ID */
  onRemoveInsertedMedia: (controlID: string) => void;
  /** CSS class name for the widget wrapper */
  classNameWrapper: string;
  /** Sets the active (focused) style on the widget */
  setActiveStyle: () => void;
  /** Sets the inactive (blurred) style on the widget */
  setInactiveStyle: () => void;
  /** The connected EditorControl component, used to render nested fields */
  editorControl: ComponentType<Record<string, unknown>>;
  /** Resolves a widget by name, returning its control/preview components */
  resolveWidget: (name: string) => Record<string, unknown>;
  /** Clears field errors for a given field ID */
  clearFieldErrors: (fieldId: string | undefined) => void;
  /** Map of field IDs to arrays of validation errors */
  fieldsErrors: Record<string, Array<{ type: string; message: string; parentIds?: string[] }>>;
  /** The current entry (immutable map with path, data, etc.) */
  entry: CmsEntry;
  /** Translation function */
  t: TranslateFunction;
  /** Parent field IDs for nested validation tracking */
  parentIds?: string[];
}

interface ListControlState {
  listCollapsed: boolean;
  itemsCollapsed: boolean[];
  value: string;
  keys: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildRef = any;

export default class ListControl extends React.Component<ListControlProps, ListControlState> {
  childRefs: Record<string, ChildRef> = {};

  static propTypes = {
    metadata: ImmutablePropTypes.map,
    onChange: PropTypes.func.isRequired,
    onChangeObject: PropTypes.func.isRequired,
    onValidateObject: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,
    value: ImmutablePropTypes.list,
    field: PropTypes.object,
    forID: PropTypes.string,
    controlRef: PropTypes.func,
    mediaPaths: ImmutablePropTypes.map.isRequired,
    getAsset: PropTypes.func.isRequired,
    onOpenMediaLibrary: PropTypes.func.isRequired,
    onAddAsset: PropTypes.func.isRequired,
    onRemoveInsertedMedia: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    editorControl: PropTypes.elementType.isRequired,
    resolveWidget: PropTypes.func.isRequired,
    clearFieldErrors: PropTypes.func.isRequired,
    fieldsErrors: ImmutablePropTypes.map.isRequired,
    entry: ImmutablePropTypes.map.isRequired,
    t: PropTypes.func,
  };

  static defaultProps = {
    value: [],
    parentIds: [],
  };

  constructor(props: ListControlProps) {
    super(props);
    const { field, value: valueInput } = props;
    const value = Array.isArray(valueInput) ? valueInput : valueInput ? [valueInput] : [];
    const listCollapsed = !!field.collapsed;
    const itemsCollapsed = (value && Array(value.length).fill(listCollapsed)) || [];
    const keys = (value && Array.from({ length: value.length }, () => uuid())) || [];

    this.state = {
      listCollapsed,
      itemsCollapsed,
      value: this.valueToString(value),
      keys,
    };
  }

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(ListControl.propTypes, this.props, 'prop', 'ListControl');
  }

  valueToString = (value: unknown): string => {
    let stringValue;
    if (Array.isArray(value)) {
      stringValue = value.join(',');
    } else {
      console.warn(
        `Expected List value to be an array but received '${value}' with type of '${typeof value}'. Please check the value provided to the '${this.props.field.name}' field`,
      );
      stringValue = String(value);
    }
    return stringValue.replace(/,([^\s]|$)/g, ', $1');
  };

  getValueType = (): string | null => {
    const { field } = this.props;
    if (field.fields) {
      return valueTypes.MULTIPLE;
    } else if (field.field) {
      return valueTypes.SINGLE;
    } else if (field[TYPES_KEY]) {
      return valueTypes.MIXED;
    } else {
      return null;
    }
  };

  uniqueFieldId = uniqueId(`${this.props.field.name}-field-`);
  /**
   * Old comment:
   *
   * Always update so that each nested widget has the option to update. This is
   * required because ControlHOC provides a default `shouldComponentUpdate`
   * which only updates if the value changes, but every widget must be allowed
   * to override this.
   *
   * New comment:
   *
   * Each Widget is wrapped with EditorControl which already tries to update every time.
   * Is there a specific reason we need to always rerender the list?
   * This seems overkill.
   */
  shouldComponentUpdate() {
    return true;
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange } = this.props;
    const oldValue = this.state.value;
    const newValue = e.target.value.trim();
    const listValue = newValue ? newValue.split(',') : [];
    if (newValue.match(/,$/) && oldValue.match(/, $/)) {
      listValue.pop();
    }

    const parsedValue = this.valueToString(listValue);
    this.setState({ value: parsedValue });
    onChange(listValue.map((val: string) => val.trim()));
  };

  handleFocus = () => {
    this.props.setActiveStyle();
  };

  handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const listValue = e.target.value
      .split(',')
      .map((el: string) => el.trim())
      .filter((el: string) => el);
    this.setState({ value: this.valueToString(listValue) });
    this.props.setInactiveStyle();
  };

  handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    const { field } = this.props;
    const parsedValue =
      this.getValueType() === valueTypes.SINGLE
        ? this.singleDefault()
        : this.multipleDefault(field.fields);
    this.addItem(parsedValue);
  };

  singleDefault = () => {
    return get(this.props.field, ['field', 'default'], null);
  };

  multipleDefault = (fields: unknown) => {
    return this.getFieldsDefault(fields);
  };

  handleAddType = (type: string, typeKey: string) => {
    const parsedValue = this.mixedDefault(typeKey, type);
    this.addItem(parsedValue);
  };

  mixedDefault = (typeKey: string, type: string) => {
    const selectedType = (this.props.field[TYPES_KEY] as CmsField[]).find(
      (f: CmsField) => f.name === type,
    ) as CmsField & { fields?: CmsField[] | unknown; field?: CmsField | unknown };
    const fields = selectedType?.fields || [selectedType?.field];

    return this.getFieldsDefault(fields, { [typeKey]: type });
  };

  getFieldsDefault = (fields: any, initialValue: Record<string, unknown> = {}): Record<string, unknown> => {
    return fields.reduce((acc: Record<string, unknown>, item: any) => {
      const subfields = item.get('field') || item.get('fields');
      const object = item.get('widget') == 'object';
      const name = item.get('name');
      const defaultValue = item.get('default', null);

      if (Array.isArray(subfields) && object) {
        const subDefaultValue = this.getFieldsDefault(subfields);
        if (!isEmpty(subDefaultValue)) {
          acc[name] = subDefaultValue;
        }
        return acc;
      }

      if (isObject(subfields) && object) {
        const subDefaultValue = this.getFieldsDefault([subfields]);
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
  };

  addItem = (parsedValue: unknown) => {
    const { value, onChange, field } = this.props;
    const addToTop = field.add_to_top ?? false;

    const itemKey = uuid();
    this.setState({
      itemsCollapsed: addToTop
        ? [false, ...this.state.itemsCollapsed]
        : [...this.state.itemsCollapsed, false],
      keys: addToTop ? [itemKey, ...this.state.keys] : [...this.state.keys, itemKey],
    });

    const listValue = Array.isArray(value) ? value : value ? [value] : [];
    if (addToTop) {
      onChange([parsedValue, ...listValue]);
    } else {
      onChange([...listValue, parsedValue]);
    }
  };

  processControlRef = (ref: ChildRef) => {
    if (!ref) return;
    const {
      props: { validationKey: key },
    } = ref;
    this.childRefs[key] = ref;
    this.props.controlRef?.(this);
  };

  validate = () => {
    // First validate child widgets if this is a complex list
    const hasChildWidgets = this.getValueType() && Object.keys(this.childRefs).length > 0;
    if (hasChildWidgets) {
      Object.values(this.childRefs).forEach((widget: ChildRef) => {
        widget?.validate?.();
      });
    } else {
      this.props.validate();
    }
    this.props.onValidateObject(this.props.forID, this.validateSize());
  };

  validateSize = () => {
    const { field, value: valueInput, t } = this.props;
    const value = Array.isArray(valueInput) ? valueInput : valueInput ? [valueInput] : [];
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
  };

  /**
   * In case the `onChangeObject` function is frozen by a child widget implementation,
   * e.g. when debounced, always get the latest object value instead of using
   * `this.props.value` directly.
   */
  getObjectValue = (idx: number) => ((this.props.value as unknown[])[idx] || {}) as Record<string, unknown>;

  handleChangeFor = memoize((index: number) => {
    return (f: CmsField, newValue: unknown, newMetadata: Record<string, unknown>) => {
      const { value: inputValue, metadata, onChange, field } = this.props;
      const value = Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
      const collectionName = field.name;
      const isListFieldObjectWidget = get(field, ['field', 'widget']) === 'object';
      const withNameKey =
        this.getValueType() !== valueTypes.SINGLE ||
        (this.getValueType() === valueTypes.SINGLE && isListFieldObjectWidget);
      let newObjectValue;
      if (withNameKey) {
        const name = f.name;
        const ov = this.getObjectValue(index)
        ov[name] = newValue;
        newObjectValue = ov;
      } else {
        newObjectValue = newValue;
      }
      const parsedMetadata = {
        [collectionName]: Object.assign(
          metadata ?? {},
          newMetadata || {},
        ),
      };

      value[index] = newObjectValue;

      onChange(value, parsedMetadata);
    };
  });

  handleRemove = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    const { itemsCollapsed } = this.state;
    const {
      value: inputValue,
      metadata,
      onChange,
      field,
      clearFieldErrors,
      onValidateObject,
      forID,
      fieldsErrors,
    } = this.props;

    const collectionName = field.name;
    const isSingleField = this.getValueType() === valueTypes.SINGLE;
    const value = inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];

    const val = { ...value };
    const metadataRemovePath = isSingleField
      ? val[index]
      : Object.values(val[index]); // TODO: Is this the correct way to get the metadata path for a list item with multiple fields? - Sem
    const parsedMetadata =
      metadata && !isEmpty(metadata)
        ? {
            [collectionName]: omit(metadata, ...metadataRemovePath),
          }
        : metadata;

    // Get the key of the item being removed
    const removedKey = this.state.keys[index];

    // Update state while preserving keys for remaining items
    const newKeys = [...this.state.keys];
    newKeys.splice(index, 1);
    itemsCollapsed.splice(index, 1);

    this.setState({
      itemsCollapsed: [...itemsCollapsed],
      keys: newKeys,
    });

    // Clear the ref for the removed item
    delete this.childRefs[removedKey];

    // Remove the item from the array
    const newValue = value.filter((_: unknown, i: number) => i !== index);

    if (fieldsErrors) {
      Object.entries(fieldsErrors).forEach(([fieldId, errors]: [string, any]) => {
        if (errors.some((err: any) => err.parentIds?.includes(removedKey))) {
          clearFieldErrors(fieldId);
        }
      });
    }

    // If list is empty, mark it as valid
    if (newValue.length === 0) {
      clearFieldErrors(forID);
      onValidateObject(forID, []);
    }

    // Update the value last to ensure all error states are cleared
    onChange(newValue, parsedMetadata);
  };

  handleItemCollapseToggle = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    const { itemsCollapsed } = this.state;
    const newItemsCollapsed = itemsCollapsed.map((collapsed: boolean, itemIndex: number) => {
      if (index === itemIndex) {
        return !collapsed;
      }
      return collapsed;
    });
    this.setState({
      itemsCollapsed: newItemsCollapsed,
    });
  };

  handleCollapseAllToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    const { value: inputValue, field } = this.props;
    const value = inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
    const { itemsCollapsed, listCollapsed } = this.state;
    const minimizeCollapsedItems = field.minimize_collapsed ?? false;
    const listCollapsedByDefault = field.collapsed ?? true;
    const allItemsCollapsed = itemsCollapsed.every((val: boolean) => val === true);

    if (minimizeCollapsedItems) {
      let updatedItemsCollapsed = itemsCollapsed;
      // Only allow collapsing all items in this mode but not opening all at once
      if (!listCollapsed || !listCollapsedByDefault) {
        updatedItemsCollapsed = Array(value.length).fill(!listCollapsed);
      }
      this.setState({ listCollapsed: !listCollapsed, itemsCollapsed: updatedItemsCollapsed });
    } else {
      this.setState({
        itemsCollapsed: Array(value.length).fill(!allItemsCollapsed),
      });
    }
  };

  objectLabel(item: unknown) {
    const { field, entry } = this.props;
    const valueType = this.getValueType();
    switch (valueType) {
      case valueTypes.MIXED: {
        if (!validateItem(field, item)) {
          return;
        }
        const itemType = getTypedFieldForValue(field, item);
        const label = itemType?.label ?? itemType?.name ?? ''
        // each type can have its own summary, but default to the list summary if exists
        const summary = get(itemType, 'summary', field?.summary);
        const labelReturn = summary
          ? handleSummary(summary, entry, label, item as Record<string, string>)
          : label;
        return labelReturn;
      }
      case valueTypes.SINGLE: {
        const singleField = field.field;
        const label = singleField?.label ?? singleField?.name ?? '';
        const summary = field?.summary;
        const data = { [singleField?.name ?? '']: item as string };
        const labelReturn = summary ? handleSummary(summary, entry, label, data) : label;
        return labelReturn;
      }
      case valueTypes.MULTIPLE: {
        if (!validateItem(field, item)) {
          return;
        }
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

  onSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    const { value: inputValue } = this.props;
    const value = inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
    const { itemsCollapsed, keys } = this.state;

    const val = { ...value };
    // Update value
    const item = val[oldIndex];
    val.splice(oldIndex, 1);
    val.splice(newIndex, 0, item);
    this.props.onChange(val);

    // Update collapsing
    const collapsed = itemsCollapsed[oldIndex];
    itemsCollapsed.splice(oldIndex, 1);
    const updatedItemsCollapsed = [...itemsCollapsed];
    updatedItemsCollapsed.splice(newIndex, 0, collapsed);

    // Move keys to maintain relationships
    const movedKey = keys[oldIndex];
    const updatedKeys = [...keys];
    updatedKeys.splice(oldIndex, 1);
    updatedKeys.splice(newIndex, 0, movedKey);

    this.setState({ itemsCollapsed: updatedItemsCollapsed, keys: updatedKeys });
  };

  hasError = (index: number) => {
    const { fieldsErrors } = this.props;
    if (fieldsErrors && !isEmpty(fieldsErrors)) {
      return Object.values(fieldsErrors).some((arr: any) =>
        arr.some((err: any) => err.parentIds && err.parentIds.includes(this.state.keys[index])),
      );
    }
  };

  focus(path: string) {
    const [index, ...remainingPath] = path.split('.');

    if (this.state.listCollapsed || this.state.itemsCollapsed[Number(index)]) {
      const newItemsCollapsed = [...this.state.itemsCollapsed];
      newItemsCollapsed[Number(index)] = false;
      this.setState(
        {
          listCollapsed: false,
          itemsCollapsed: newItemsCollapsed,
        },
        () => {
          const key = this.state.keys[Number(index)];
          const control = this.childRefs[key];
          if (control?.focus) {
            control.focus(remainingPath.join('.'));
          }
        },
      );
    } else {
      const key = this.state.keys[Number(index)];
      const control = this.childRefs[key];
      if (control?.focus) {
        control.focus(remainingPath.join('.'));
      }
    }
  }

  getStableParentIds = memoize(
    (parentIds: string[], forID: string | undefined, key: string) => [...parentIds, forID ?? '', key],
    (parentIds: string[], forID: string | undefined, key: string) =>
      JSON.stringify([...parentIds, forID, key]),
  );

  renderItem = (item: unknown, index: number) => {
    const {
      classNameWrapper,
      editorControl,
      onValidateObject,
      metadata,
      clearFieldErrors,
      fieldsErrors,
      controlRef,
      resolveWidget,
      parentIds = [],
      forID,
      t,
    } = this.props;

    const { itemsCollapsed, keys } = this.state;
    const collapsed = itemsCollapsed[index];
    const key = keys[index];
    let field: CmsField | undefined = this.props.field;
    const hasError = this.hasError(index);
    const isVariableTypesList = this.getValueType() === valueTypes.MIXED;
    if (isVariableTypesList) {
      field = getTypedFieldForValue(field!, item);
      if (!field) {
        return this.renderErroneousTypedItem(index, item);
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
            field={field!}
            isActive={false}
            hasErrors={hasError}
            uniqueFieldId={this.uniqueFieldId}
            isFieldOptional={field.required === false}
            t={t}
          />
        )}
        <StyledListItemTopBar
          collapsed={collapsed}
          onCollapseToggle={() => this.handleItemCollapseToggle(index, { preventDefault: () => {} } as React.MouseEvent)}
          dragHandle={DragHandle}
          id={key}
          allowRemove={field!.allow_remove ?? true}
          allowReorder={field!.allow_reorder ?? true}
          onRemove={() => this.handleRemove(index, { preventDefault: () => {} } as React.MouseEvent)}
          data-testid={`styled-list-item-top-bar-${key}`}
        />
        <NestedObjectLabel collapsed={collapsed} error={hasError}>
          {this.objectLabel(item)}
        </NestedObjectLabel>
        <ClassNames>
          {({ css, cx }) => (
            <ObjectControl
              classNameWrapper={cx(classNameWrapper, {
                [css`
                  ${styleStrings.collapsedObjectControl};
                `]: collapsed,
              })}
              value={item as Record<string, unknown>}
              field={field as CmsFieldObject & CmsFieldBase /* It seems to me that the nested field should be passed but maybe this is a hack to pass the field to the object widget and have it render the field or fields properties? */}
              onChangeObject={this.handleChangeFor(index) as (...args: unknown[]) => unknown}
              editorControl={editorControl}
              resolveWidget={resolveWidget}
              metadata={metadata}
              forList
              onValidateObject={onValidateObject }
              clearFieldErrors={clearFieldErrors}
              fieldsErrors={fieldsErrors}
              ref={this.processControlRef}
              controlRef={controlRef as any /* TODO: Fix strange typescript error */}
              validationKey={key}
              t={t}
              collapsed={collapsed}
              data-testid={`object-control-${key}`}
              hasError={hasError}
              parentIds={this.getStableParentIds(parentIds, forID, key)}
            />
          )}
        </ClassNames>
      </SortableListItem>
    );
  };

  renderErroneousTypedItem(index: number, item: unknown) {
    const field = this.props.field;
    const errorMessage = getErrorMessageForTypedFieldAndValue(field, item as Record<string, unknown>);
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
          onRemove={() => this.handleRemove(index, { preventDefault: () => {} } as React.MouseEvent)}
          dragHandle={DragHandle}
          id={key}
        />
        <NestedObjectLabel collapsed={true} error={true}>
          {errorMessage}
        </NestedObjectLabel>
      </SortableListItem>
    );
  }

  renderListControl() {
    const { value: inputValue, forID, field, classNameWrapper, t } = this.props;
    const value = inputValue && Array.isArray(inputValue) ? inputValue : inputValue ? [inputValue] : [];
    const { itemsCollapsed, listCollapsed, keys } = this.state;
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
        {({ cx, css }) => (
          <div
            id={forID}
            className={cx(
              classNameWrapper,
              css`
                ${styleStrings.objectWidgetTopBarContainer}
              `,
            )}
          >
            <ObjectWidgetTopBar
              allowAdd={field.allow_add}
              onAdd={() => this.handleAdd({ preventDefault: () => {} } as React.MouseEvent)}
              types={field[TYPES_KEY] as unknown as TypeItem[]} // TODO: Check types
              onAddType={(type: string) => this.handleAddType(type, resolveFieldKeyType(field))}
              heading={`${items.length} ${listLabel}`}
              label={labelSingular.toLowerCase()}
              onCollapseToggle={() => this.handleCollapseAllToggle({ preventDefault: () => {} } as React.MouseEvent)}
              collapsed={selfCollapsed}
              t={t!}
            />
            {(!selfCollapsed || !minimizeCollapsedItems) && (
              <SortableList items={itemsArray} keys={keys} onSortEnd={this.onSortEnd}>
                {items.map(this.renderItem)}
              </SortableList>
            )}
          </div>
        )}
      </ClassNames>
    );
  }

  renderInput() {
    const { forID, classNameWrapper } = this.props;
    const { value } = this.state;

    return (
      <input
        type="text"
        id={forID}
        value={value}
        onChange={this.handleChange}
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
        className={classNameWrapper}
      />
    );
  }

  render() {
    if (this.getValueType() !== null) {
      return this.renderListControl();
    } else {
      return this.renderInput();
    }
  }
}
