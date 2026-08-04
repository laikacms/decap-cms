import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import last from 'lodash/last';
import uniqBy from 'lodash/uniqBy';
import { fromJS, List, Map } from 'immutable';
import {
  reactSelectStyles,
  colors,
  colorsRaw,
  lengths,
  shadows,
  buttons,
} from 'decap-cms-ui-default';
import { stringTemplate, validations } from 'decap-cms-lib-widgets';
import { FixedSizeList } from 'react-window';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

import relationCache from './RelationCache';

/**
 * Normalise camelCase field config keys to snake_case.
 * The schema's oneOf allows both forms; the implementation reads only snake_case.
 * Coalescing here keeps backward compat and makes the schema promise real.
 */
export function normalizeField(field) {
  let normalized = field;
  if (!normalized.get('value_field') && normalized.get('valueField')) {
    normalized = normalized.set('value_field', normalized.get('valueField'));
  }
  if (!normalized.get('search_fields') && normalized.get('searchFields')) {
    normalized = normalized.set('search_fields', normalized.get('searchFields'));
  }
  if (!normalized.get('display_fields') && normalized.get('displayFields')) {
    normalized = normalized.set('display_fields', normalized.get('displayFields'));
  }
  if (!normalized.get('options_length') && normalized.get('optionsLength')) {
    normalized = normalized.set('options_length', normalized.get('optionsLength'));
  }
  return normalized;
}

export function arrayMove(array, from, to) {
  const slicedArray = array.slice();
  slicedArray.splice(to < 0 ? array.length + to : to, 0, slicedArray.splice(from, 1)[0]);
  return slicedArray;
}

function MultiValue(props) {
  const { setNodeRef, transform, transition } = useSortable({
    id: props.data.data.id,
  });

  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const innerProps = { ...props.innerProps, onMouseDown };
  return (
    <div ref={setNodeRef} style={style}>
      <components.MultiValue {...props} innerProps={innerProps} />
    </div>
  );
}

function MultiValueLabel(props) {
  const { attributes, listeners } = useSortable({
    id: props.data.data.id,
  });

  return (
    <div {...attributes} {...listeners}>
      <components.MultiValueLabel {...props} />
    </div>
  );
}

function SortableSelect(props) {
  const { distance, value, onSortEnd, isMulti } = props;

  if (!isMulti) {
    return <AsyncSelect {...props} />;
  }

  const keys = Array.isArray(value) ? value.map(({ data }) => data.id) : [];

  const activationConstraint = { distance };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
  );

  function handleSortEnd({ active, over }) {
    onSortEnd({
      oldIndex: keys.indexOf(active.id),
      newIndex: keys.indexOf(over.id),
    });
  }

  return (
    <DndContext
      modifiers={[restrictToParentElement]}
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleSortEnd}
    >
      <SortableContext items={keys} strategy={horizontalListSortingStrategy}>
        <AsyncSelect {...props} />
      </SortableContext>
    </DndContext>
  );
}

function Option({ index, style, data }) {
  return <div style={style}>{data.options[index]}</div>;
}

function MenuList(props) {
  if (props.isLoading || props.options.length <= 0 || !Array.isArray(props.children)) {
    return props.children;
  }
  const rows = props.children;
  const itemSize = 30;
  return (
    <FixedSizeList
      style={{ width: '100%' }}
      width={300}
      height={Math.min(300, rows.length * itemSize + itemSize / 3)}
      itemCount={rows.length}
      itemSize={itemSize}
      itemData={{ options: rows }}
    >
      {Option}
    </FixedSizeList>
  );
}

export function optionToString(option) {
  return option && option.value ? option.value : '';
}

export function convertToOption(raw) {
  if (typeof raw === 'string') {
    return { label: raw, value: raw };
  }

  return Map.isMap(raw) ? raw.toJS() : raw;
}

export function getSelectedOptions(value) {
  const selectedOptions = List.isList(value) ? value.toJS() : value;

  if (!selectedOptions || !Array.isArray(selectedOptions)) {
    return null;
  }

  return selectedOptions;
}

export function uniqOptions(initial, current) {
  return uniqBy(initial.concat(current), o => o.value);
}

export function getFieldArray(field) {
  if (!field) {
    return [];
  }

  return List.isList(field) ? field.toJS() : [field];
}

/**
 * Resolves a single (possibly templated) display/value field path against a
 * plain entry data object. Shared by RelationControl (which has a full `hit`
 * with `path`/`slug` available from a search result) and RelationPreview
 * (which only has the raw entry data cached in `fieldsMetaData`, so `path`
 * and `slug` are omitted).
 */
export function resolveTemplatedField(data, field, path, slug) {
  const templateVars = stringTemplate.extractTemplateVars(field);
  if (templateVars.length <= 0) {
    return get(data, field);
  }
  const templatedData = stringTemplate.addFileTemplateFields(path, data);
  return stringTemplate.compileStringTemplate(field, null, slug, templatedData);
}

/**
 * Builds the human-readable `display_fields` label for a given entry data
 * object, mirroring how RelationControl.parseHitOptions labels options.
 * Falls back to an empty string per field when no data is found.
 */
export function getDisplayFieldsLabel(data, displayFields, path, slug) {
  const fields = getFieldArray(displayFields);
  return fields
    .map(key => resolveTemplatedField(data, key, path, slug))
    .filter(value => value !== undefined && value !== null && value !== '')
    .join(' ');
}

/**
 * Field keys usable in the quick-add minimal-fields form: plain top-level
 * field names only. Templated (`{{...}}`) or dotted/nested paths can't be
 * mapped back to a single input the way `value_field`/`display_fields`
 * can be resolved for an existing, already-saved hit, so they're left out
 * here - filling those in is part of the "advanced options" follow-up
 * (DCMS-1421 scope note), not this quick-add slice.
 */
function isSimpleFieldKey(key) {
  return typeof key === 'string' && key.length > 0 && !key.includes('.') && !key.includes('{{');
}

/**
 * The set of field names the quick-add form should collect: the relation's
 * `value_field` plus its `display_fields`, deduplicated, restricted to
 * `isSimpleFieldKey`. Exported for testing.
 */
export function getQuickAddFieldNames(field) {
  const valueField = field.get('value_field');
  const displayFields = getFieldArray(field.get('display_fields'));
  const candidates = [valueField, ...displayFields].filter(isSimpleFieldKey);
  return Array.from(new Set(candidates));
}

/**
 * Turns the plain `data` object returned by a successful quick-add persist
 * into the same `{ label, value, data }` option shape `parseHitOptions`
 * builds for search hits, so it can be selected via the normal
 * `handleChange` path.
 */
export function buildQuickAddOption(field, data) {
  const valueField = field.get('value_field');
  const displayFields = field.get('display_fields') || List([valueField]);
  const value = resolveTemplatedField(data, valueField);
  const label = getDisplayFieldsLabel(data, displayFields) || value;
  return { data, value, label };
}

/**
 * Looks up the cached hit data for a relation's stored value from the
 * `fieldsMetaData` tree built by RelationControl (`{ [collection]: { [value]:
 * hitData } }`) and resolves it to a display label using `display_fields`.
 * Returns `undefined` when no cached metadata exists for the value (e.g. the
 * entry hasn't been searched/loaded yet), so callers can fall back to the
 * raw stored value.
 */
export function getCachedDisplayLabel(fieldsMetaData, field, value) {
  if (!fieldsMetaData || value == null || value === '') {
    return undefined;
  }

  const collection = field.get('collection');
  const hitData = Map.isMap(fieldsMetaData)
    ? fieldsMetaData.getIn([collection, value])
    : get(fieldsMetaData, [collection, value]);

  if (hitData == null) {
    return undefined;
  }

  const data = Map.isMap(hitData) ? hitData.toJS() : hitData;
  const displayFields = field.get('display_fields') || List([field.get('value_field')]);
  const label = getDisplayFieldsLabel(data, displayFields);

  return label === '' ? undefined : label;
}

export function getSelectedValue({ value, options, isMultiple }) {
  if (isMultiple) {
    const selectedOptions = getSelectedOptions(value);
    if (selectedOptions === null) {
      return null;
    }

    const selected = selectedOptions
      .map(i => options.find(o => o.value === (i.value || i)))
      .filter(Boolean)
      .map(convertToSortableOption);
    return selected;
  } else {
    return find(options, ['value', value]) || null;
  }
}

export function convertToSortableOption(raw) {
  const option = convertToOption(raw);
  return {
    ...option,
    data: {
      ...option.data,
      id: crypto.randomUUID(),
    },
  };
}

const QuickAddButton = styled.button`
  ${buttons.button};
  margin-top: 8px;
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  background-color: ${colorsRaw.grayLight};
  color: ${colors.textLead};
`;

const QuickAddBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const QuickAddPanel = styled.form`
  ${shadows.dropDeep};
  background-color: ${colorsRaw.white};
  border-radius: ${lengths.borderRadius};
  max-width: 480px;
  width: calc(100% - 2rem);
  padding: 20px;
  box-sizing: border-box;
`;

const QuickAddTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const QuickAddFieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.controlLabel};
  margin-bottom: 4px;
`;

const QuickAddInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 14px;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid ${colors.textFieldBorder};
  border-radius: ${lengths.borderRadius};

  &:focus {
    outline: 2px solid ${colors.active};
    outline-offset: 1px;
  }
`;

const QuickAddError = styled.p`
  color: ${colors.errorText};
  font-size: 12px;
  margin: 0 0 12px;
`;

const QuickAddFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const QuickAddDialogButton = styled.button`
  ${buttons.button};
  height: 36px;
  line-height: 36px;
  padding: 0 15px;
  font-weight: 500;
  font-size: 14px;
  background-color: ${props => (props.variant === 'primary' ? colors.active : colorsRaw.grayLight)};
  color: ${props => (props.variant === 'primary' ? colorsRaw.white : colors.textLead)};
`;

function QuickAddModal({ collection, values, submitting, error, onChange, onCancel, onSubmit, t }) {
  const fieldNames = Object.keys(values);
  const title = t
    ? t('widget.relation.quickAdd.title', { collection })
    : `Create new ${collection}`;
  const saveLabel = t ? t('widget.relation.quickAdd.save') : 'Save';
  const cancelLabel = t ? t('widget.relation.quickAdd.cancel') : 'Cancel';

  return ReactDOM.createPortal(
    <QuickAddBackdrop
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <QuickAddPanel role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit}>
        <QuickAddTitle>{title}</QuickAddTitle>
        {fieldNames.map(name => (
          <div key={name}>
            <QuickAddFieldLabel htmlFor={`quick-add-${name}`}>{name}</QuickAddFieldLabel>
            <QuickAddInput
              id={`quick-add-${name}`}
              type="text"
              value={values[name]}
              disabled={submitting}
              onChange={event => onChange(name, event.target.value)}
            />
          </div>
        ))}
        {error && <QuickAddError>{error}</QuickAddError>}
        <QuickAddFooter>
          <QuickAddDialogButton type="button" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </QuickAddDialogButton>
          <QuickAddDialogButton type="submit" variant="primary" disabled={submitting}>
            {saveLabel}
          </QuickAddDialogButton>
        </QuickAddFooter>
      </QuickAddPanel>
    </QuickAddBackdrop>,
    document.body,
  );
}

QuickAddModal.propTypes = {
  collection: PropTypes.string.isRequired,
  values: PropTypes.objectOf(PropTypes.string).isRequired,
  submitting: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  t: PropTypes.func,
};

export default class RelationControl extends React.Component {
  mounted = false;

  state = {
    initialOptions: [],
    quickAdd: null,
  };

  get field() {
    return normalizeField(this.props.field);
  }

  static propTypes = {
    onChange: PropTypes.func.isRequired,
    forID: PropTypes.string.isRequired,
    value: PropTypes.node,
    field: ImmutablePropTypes.map,
    query: PropTypes.func.isRequired,
    queryHits: PropTypes.array,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    locale: PropTypes.string,
    onQuickCreateEntry: PropTypes.func,
  };

  isValid = () => {
    const field = this.field;
    const { value, t } = this.props;
    const min = field.get('min');
    const max = field.get('max');

    if (!this.isMultiple()) {
      return { error: false };
    }

    const error = validations.validateMinMax(
      t,
      field.get('label', field.get('name')),
      value,
      min,
      max,
    );

    return error ? { error } : { error: false };
  };

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.props.value !== nextProps.value ||
      this.props.hasActiveStyle !== nextProps.hasActiveStyle ||
      this.props.queryHits !== nextProps.queryHits ||
      // The quick-add modal (DCMS-1421) is driven entirely by local state -
      // opening it, typing into its fields, submitting - none of which
      // touches `value`/`hasActiveStyle`/`queryHits`, so it must be checked
      // here too or the modal would never visibly open/update.
      this.state.quickAdd !== nextState.quickAdd
    );
  }

  async componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(RelationControl.propTypes, this.props, 'prop', 'RelationControl');

    this.mounted = true;
    const { value } = this.props;
    if (value && this.hasInitialValues(value)) {
      await this.loadInitialOptions();
    }
  }

  hasInitialValues(value) {
    if (this.isMultiple()) {
      const selectedOptions = getSelectedOptions(value);
      return selectedOptions && selectedOptions.length > 0;
    }
    return value && value !== '';
  }

  async loadInitialOptions() {
    const { query, forID, value } = this.props;
    const field = this.field;
    const collection = field.get('collection');
    const searchFieldsArray = getFieldArray(field.get('search_fields'));
    const file = field.get('file');

    try {
      const result = await relationCache.getOptions(
        collection,
        searchFieldsArray,
        '', // empty term for initial load
        file,
        () => query(forID, collection, searchFieldsArray, '', file),
      );

      const hits = result.payload.hits || [];
      const options = this.parseHitOptions(hits);

      if (this.mounted) {
        this.setState({ initialOptions: options });

        // Call onChange with metadata for initial values
        if (value && this.hasInitialValues(value)) {
          this.triggerInitialOnChange(value, options);
        }
      }
    } catch (error) {
      console.error('Failed to load initial options:', error);
    }
  }

  triggerInitialOnChange(value, options) {
    const { onChange } = this.props;
    const field = this.field;

    if (this.isMultiple()) {
      const selectedOptions = getSelectedOptions(value);
      if (selectedOptions && selectedOptions.length > 0) {
        const matchedOptions = selectedOptions
          .map(val => options.find(opt => opt.value === (val.value || val)))
          .filter(Boolean);

        if (matchedOptions.length > 0) {
          const metadata = {
            [field.get('name')]: {
              [field.get('collection')]: matchedOptions.reduce(
                (acc, option) => ({
                  ...acc,
                  [option.value]: option.data,
                }),
                {},
              ),
            },
          };
          onChange(value, metadata);
        }
      }
    } else {
      const matchedOption = options.find(opt => opt.value === value);
      if (matchedOption) {
        const metadata = {
          [field.get('name')]: {
            [field.get('collection')]: {
              [matchedOption.value]: matchedOption.data,
            },
          },
        };
        onChange(value, metadata);
      }
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onSortEnd =
    options =>
    ({ oldIndex, newIndex }) => {
      const { onChange } = this.props;
      const field = this.field;
      const value = options.map(optionToString);
      const newValue = arrayMove(value, oldIndex, newIndex);
      const newOptions = arrayMove(options, oldIndex, newIndex);
      const metadata =
        (!isEmpty(options) && {
          [field.get('name')]: {
            [field.get('collection')]: {
              [last(newValue)]: last(newOptions).data,
            },
          },
        }) ||
        {};
      onChange(fromJS(newValue), metadata);
    };

  handleChange = selectedOption => {
    const { onChange } = this.props;
    const field = this.field;

    if (this.isMultiple()) {
      const options = selectedOption;
      this.setState({ initialOptions: options.filter(Boolean) });
      const value = options.map(optionToString);
      const metadata =
        (!isEmpty(options) && {
          [field.get('name')]: {
            [field.get('collection')]: {
              [last(value)]: last(options).data,
            },
          },
        }) ||
        {};
      onChange(fromJS(value), metadata);
    } else {
      this.setState({ initialOptions: [selectedOption].filter(Boolean) });
      const value = optionToString(selectedOption);
      const metadata = selectedOption && {
        [field.get('name')]: {
          [field.get('collection')]: { [value]: selectedOption.data },
        },
      };
      onChange(value, metadata);
    }
  };

  canQuickAdd = () => Boolean(this.props.onQuickCreateEntry);

  openQuickAdd = () => {
    const values = {};
    getQuickAddFieldNames(this.field).forEach(name => {
      values[name] = '';
    });
    this.setState({ quickAdd: { values, submitting: false, error: null } });
  };

  closeQuickAdd = () => {
    this.setState({ quickAdd: null });
  };

  updateQuickAddValue = (name, value) => {
    this.setState(state => ({
      quickAdd: { ...state.quickAdd, values: { ...state.quickAdd.values, [name]: value } },
    }));
  };

  /**
   * Selects a freshly quick-added entry in place, reusing the normal
   * `handleChange` path so metadata/onChange behave exactly as they would
   * for a search result the user picked from the dropdown.
   */
  selectQuickAddOption = option => {
    if (this.isMultiple()) {
      const pool = uniqOptions(this.state.initialOptions, [option]);
      const currentSelected =
        getSelectedValue({ options: pool, value: this.props.value, isMultiple: true }) || [];
      this.handleChange([...currentSelected, convertToSortableOption(option)]);
    } else {
      this.handleChange(option);
    }
  };

  submitQuickAdd = event => {
    event.preventDefault();
    const { onQuickCreateEntry } = this.props;
    const { quickAdd } = this.state;
    if (!onQuickCreateEntry || !quickAdd || quickAdd.submitting) {
      return;
    }

    const field = this.field;
    const collection = field.get('collection');

    this.setState(state => ({ quickAdd: { ...state.quickAdd, submitting: true, error: null } }));

    Promise.resolve(onQuickCreateEntry(collection, quickAdd.values))
      .then(data => {
        if (!this.mounted) {
          return;
        }
        const option = buildQuickAddOption(field, data);
        this.selectQuickAddOption(option);
        this.setState({ quickAdd: null });
      })
      .catch(error => {
        if (!this.mounted) {
          return;
        }
        const message = (error && error.message) || String(error);
        this.setState(state => ({
          quickAdd: { ...state.quickAdd, submitting: false, error: message },
        }));
      });
  };

  parseNestedFields = (hit, field) => {
    const { locale } = this.props;
    const hitData =
      locale != null && hit.i18n != null && hit.i18n[locale] != null
        ? hit.i18n[locale].data
        : hit.data;
    return resolveTemplatedField(hitData, field, hit.path, hit.slug);
  };

  isMultiple() {
    return this.field.get('multiple', false);
  }

  parseHitOptions = hits => {
    const field = this.field;
    const valueField = field.get('value_field');
    const displayField = field.get('display_fields') || List([field.get('value_field')]);
    const filters = getFieldArray(field.get('filters'));

    const options = hits.reduce((acc, hit) => {
      if (
        filters.every(filter => {
          // check if the value for the (nested) filter field is in the filter values
          const fieldKeys = filter.field.split('.');
          let value = hit.data;
          for (let i = 0; i < fieldKeys.length; i++) {
            if (Object.prototype.hasOwnProperty.call(value, fieldKeys[i])) {
              value = value[fieldKeys[i]];
            } else {
              return false;
            }
          }
          return filter.values.includes(value);
        })
      ) {
        const valuesPaths = stringTemplate.expandPath({ data: hit.data, path: valueField });
        for (let i = 0; i < valuesPaths.length; i++) {
          const label = displayField
            .toJS()
            .map(key => {
              const displayPaths = stringTemplate.expandPath({ data: hit.data, path: key });
              return this.parseNestedFields(hit, displayPaths[i] || displayPaths[0]);
            })
            .join(' ');
          const value = this.parseNestedFields(hit, valuesPaths[i]);
          acc.push({ data: hit.data, value, label });
        }
      }

      return acc;
    }, []);

    return options;
  };

  loadOptions = debounce((term, callback) => {
    const { query, forID } = this.props;
    const field = this.field;
    const collection = field.get('collection');
    const searchFieldsArray = getFieldArray(field.get('search_fields'));
    const file = field.get('file');

    relationCache
      .getOptions(collection, searchFieldsArray, term, file, () =>
        query(forID, collection, searchFieldsArray, term, file),
      )
      .then(result => {
        const hits = result.payload.hits || [];
        const options = this.parseHitOptions(hits);
        const optionsLength = field.get('options_length') || 20;
        const uniq = uniqOptions(this.state.initialOptions, options).slice(0, optionsLength);
        callback(uniq);
      })
      .catch(error => {
        console.error('Failed to load options:', error);
        callback([]);
      });
  }, 500);

  render() {
    const { value, forID, classNameWrapper, setActiveStyle, setInactiveStyle, queryHits, t } =
      this.props;
    const field = this.field;
    const isMultiple = this.isMultiple();
    const isClearable = !field.get('required', true) || isMultiple;
    const collectionName = field.get('collection');

    const queryOptions = this.parseHitOptions(queryHits);
    const options = uniqOptions(this.state.initialOptions, queryOptions);
    const selectedValue = getSelectedValue({
      options,
      value,
      isMultiple,
    });

    const { quickAdd } = this.state;

    return (
      <>
        <SortableSelect
          useDragHandle
          onSortEnd={this.onSortEnd(selectedValue)}
          distance={4}
          // react-select props:
          components={{ MenuList, MultiValue, MultiValueLabel }}
          value={selectedValue}
          inputId={forID}
          cacheOptions
          defaultOptions
          loadOptions={this.loadOptions}
          onChange={this.handleChange}
          className={classNameWrapper}
          onFocus={setActiveStyle}
          onBlur={setInactiveStyle}
          styles={reactSelectStyles}
          isMulti={isMultiple}
          isClearable={isClearable}
          placeholder=""
        />
        {this.canQuickAdd() && (
          <QuickAddButton type="button" onClick={this.openQuickAdd}>
            {t
              ? t('widget.relation.quickAdd.action', { collection: collectionName })
              : `+ Create new ${collectionName}`}
          </QuickAddButton>
        )}
        {quickAdd && (
          <QuickAddModal
            collection={collectionName}
            values={quickAdd.values}
            submitting={quickAdd.submitting}
            error={quickAdd.error}
            onChange={this.updateQuickAddValue}
            onCancel={this.closeQuickAdd}
            onSubmit={this.submitQuickAdd}
            t={t}
          />
        )}
      </>
    );
  }
}
