import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import last from 'lodash/last';
import uniqBy from 'lodash/uniqBy';
import { fromJS, List as ImmutableList, Map } from 'immutable';
import { reactSelectStyles } from 'decap-cms-ui-default';
import { stringTemplate, validations } from 'decap-cms-lib-widgets';
import { List as VirtualList } from 'react-window';
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
import { v4 as uuid } from 'uuid';

import relationCache from './RelationCache';

import type { CSSProperties, ReactElement } from 'react';
import type { List } from 'immutable';
import type { MultiValueProps, MultiValueGenericProps, GroupBase } from 'react-select';

interface RelationOption {
  label: string;
  value: string;
  data?: Record<string, unknown>;
}

interface SortableOption extends RelationOption {
  data: Record<string, unknown> & { id: string };
}

interface HitData {
  [key: string]: unknown;
}

interface Hit {
  data: HitData;
  i18n?: Record<string, { data: HitData }>;
  path: string;
  slug: string;
}

interface QueryResult {
  payload: {
    hits: Hit[];
  };
}

interface FilterObj {
  field: string;
  values: unknown[];
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const slicedArray = array.slice();
  slicedArray.splice(to < 0 ? array.length + to : to, 0, slicedArray.splice(from, 1)[0]);
  return slicedArray;
}

function MultiValue(props: MultiValueProps<unknown, boolean, GroupBase<unknown>>) {
  const propsData = props.data as { data: { id: string } };
  const { setNodeRef, transform, transition } = useSortable({
    id: propsData.data.id,
  });

  function onMouseDown(e: React.MouseEvent) {
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

function MultiValueLabel(props: MultiValueGenericProps<unknown, boolean, GroupBase<unknown>>) {
  const propsData = props.data as { data: { id: string } };
  const { attributes, listeners } = useSortable({
    id: propsData.data.id,
  });

  return (
    <div {...attributes} {...listeners}>
      <components.MultiValueLabel {...props} />
    </div>
  );
}

function SortableSelect(props: Record<string, unknown>) {
  const { distance, value, onSortEnd, isMulti } = props as {
    distance: number;
    value: SortableOption[];
    onSortEnd: (args: { oldIndex: number; newIndex: number }) => void;
    isMulti: boolean;
  };

  if (!isMulti) {
    return <AsyncSelect {...(props as React.ComponentProps<typeof AsyncSelect>)} />;
  }

  const keys = Array.isArray(value) ? value.map(({ data }) => data.id) : [];

  const activationConstraint = { distance };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
  );

  function handleSortEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
    if (!over) return;
    onSortEnd({
      oldIndex: keys.indexOf(String(active.id)),
      newIndex: keys.indexOf(String(over.id)),
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
        <AsyncSelect {...(props as React.ComponentProps<typeof AsyncSelect>)} />
      </SortableContext>
    </DndContext>
  );
}

interface OptionRowProps {
  options: React.ReactNode[];
}

function OptionRow(props: {
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
  index: number;
  style: CSSProperties;
} & OptionRowProps): ReactElement | null {
  const { index, style, options } = props;
  return <div style={style}>{options[index]}</div>;
}

function MenuList(props: Record<string, unknown>) {
  const isLoading = props.isLoading as boolean;
  const options = props.options as unknown[];
  const children = props.children;

  if (isLoading || options.length <= 0 || !Array.isArray(children)) {
    return children as React.ReactElement;
  }
  const rows = children as React.ReactNode[];
  const itemSize = 30;
  const listHeight = Math.min(300, rows.length * itemSize + itemSize / 3);
  return (
    <VirtualList<OptionRowProps>
      style={{ width: '100%', height: listHeight }}
      rowCount={rows.length}
      rowHeight={itemSize}
      rowProps={{ options: rows }}
      rowComponent={OptionRow}
    />
  );
}

function optionToString(option: RelationOption | null | undefined): string {
  return option && option.value ? option.value : '';
}

function convertToOption(raw: unknown): RelationOption {
  if (typeof raw === 'string') {
    return { label: raw, value: raw };
  }

  return Map.isMap(raw) ? (raw as Map<string, unknown>).toJS() as unknown as RelationOption : raw as RelationOption;
}

function getSelectedOptions(value: unknown): RelationOption[] | null {
  const selectedOptions = ImmutableList.isList(value) ? (value as List<unknown>).toJS() : value;

  if (!selectedOptions || !Array.isArray(selectedOptions)) {
    return null;
  }

  return selectedOptions as RelationOption[];
}

function uniqOptions(initial: RelationOption[], current: RelationOption[]): RelationOption[] {
  return uniqBy(initial.concat(current), (o: RelationOption) => o.value);
}

function getFieldArray(field: unknown): string[] {
  if (!field) {
    return [];
  }

  return ImmutableList.isList(field) ? (field as List<string>).toJS() as string[] : [field as string];
}

function getSelectedValue({ value, options, isMultiple }: { value: unknown; options: RelationOption[]; isMultiple: boolean }): SortableOption[] | RelationOption | null {
  if (isMultiple) {
    const selectedOptions = getSelectedOptions(value);
    if (selectedOptions === null) {
      return null;
    }

    const selected = selectedOptions
      .map((i: RelationOption) => options.find((o: RelationOption) => o.value === (i.value || i)))
      .filter(Boolean)
      .map(convertToSortableOption);
    return selected;
  } else {
    return find(options, ['value', value]) || null;
  }
}

function convertToSortableOption(raw: unknown): SortableOption {
  const option = convertToOption(raw);
  return {
    ...option,
    data: {
      ...option.data,
      id: uuid(),
    },
  };
}

interface RelationControlProps {
  onChange: (...args: unknown[]) => unknown;
  forID: string;
  value?: unknown;
  field: Map<string, unknown>;
  query: (...args: unknown[]) => Promise<QueryResult>;
  queryHits?: Hit[];
  classNameWrapper: string;
  setActiveStyle: (...args: unknown[]) => unknown;
  setInactiveStyle: (...args: unknown[]) => unknown;
  locale?: string;
  hasActiveStyle?: boolean;
  t: (key: string, options?: unknown) => string;
}

interface RelationControlState {
  initialOptions: RelationOption[];
}

export default class RelationControl extends React.Component<RelationControlProps, RelationControlState> {
  mounted = false;

  state: RelationControlState = {
    initialOptions: [],
  };

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
  };

  isValid = () => {
    const { field, value, t } = this.props;
    const min = field.get('min') as number | undefined;
    const max = field.get('max') as number | undefined;

    if (!this.isMultiple()) {
      return { error: false };
    }

    const error = validations.validateMinMax(
      t,
      field.get('label', field.get('name')) as string,
      value as List<unknown> | undefined,
      min,
      max,
    );

    return error ? { error } : { error: false };
  };

  shouldComponentUpdate(nextProps: RelationControlProps) {
    return (
      this.props.value !== nextProps.value ||
      this.props.hasActiveStyle !== nextProps.hasActiveStyle ||
      this.props.queryHits !== nextProps.queryHits
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

  componentWillUnmount() {
    this.mounted = false;
  }

  isMultiple = (): boolean => {
    return this.props.field.get('multiple', false) as boolean;
  };

  hasInitialValues = (value: unknown): boolean => {
    if (this.isMultiple()) {
      const selectedOptions = getSelectedOptions(value);
      return selectedOptions !== null && selectedOptions.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  };

  loadInitialOptions = async () => {
    const { field, query, forID, value } = this.props;
    const collection = field.get('collection') as string;
    const searchFieldsArray = getFieldArray(field.get('search_fields'));
    const file = field.get('file') as string | undefined;

    try {
      const result = await relationCache.getOptions(
        collection,
        searchFieldsArray,
        '', // empty term for initial load
        file,
        () => query(forID, collection, searchFieldsArray, '', file),
      ) as QueryResult;

      const hits = result.payload.hits || [];
      const options = this.parseHitOptions(hits);

      if (this.mounted) {
        this.setState({ initialOptions: options });

        // Call onChange with metadata for initial values
        if (value && this.hasInitialValues(value)) {
          this.triggerInitialOnChange(value, options);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to load initial options:', error);
    }
  };

  triggerInitialOnChange = (value: unknown, options: RelationOption[]) => {
    const { onChange, field } = this.props;

    if (this.isMultiple()) {
      const selectedOptions = getSelectedOptions(value);
      if (selectedOptions && selectedOptions.length > 0) {
        const matchedOptions = selectedOptions
          .map((val: RelationOption) => options.find((opt: RelationOption) => opt.value === (val.value || val)))
          .filter(Boolean) as RelationOption[];

        if (matchedOptions.length > 0) {
          const metadata = {
            [field.get('name') as string]: {
              [field.get('collection') as string]: matchedOptions.reduce(
                (acc: Record<string, unknown>, option: RelationOption) => ({
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
      const matchedOption = options.find((opt: RelationOption) => opt.value === value);
      if (matchedOption) {
        const metadata = {
          [field.get('name') as string]: {
            [field.get('collection') as string]: {
              [matchedOption.value]: matchedOption.data,
            },
          },
        };
        onChange(value, metadata);
      }
    }
  };

  onSortEnd =
    (options: RelationOption[]) =>
    ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      const { onChange, field } = this.props;
      const value = options.map(optionToString);
      const newValue = arrayMove(value, oldIndex, newIndex);
      const lastOption = last(options);
      const lastValue = last(newValue);
      const metadata =
        (!isEmpty(options) && lastOption && lastValue && {
          [field.get('name') as string]: {
            [field.get('collection') as string]: {
              [lastValue]: lastOption.data,
            },
          },
        }) ||
        {};
      onChange(fromJS(newValue), metadata);
    };

  handleChange = (selectedOption: RelationOption | RelationOption[] | null) => {
    const { onChange, field } = this.props;

    if (this.isMultiple()) {
      const options = (selectedOption || []) as RelationOption[];
      this.setState({ initialOptions: options.filter(Boolean) });
      const value = options.map(optionToString);
      const lastOption = last(options);
      const lastValue = last(value);
      const metadata =
        (!isEmpty(options) && lastOption && lastValue && {
          [field.get('name') as string]: {
            [field.get('collection') as string]: {
              [lastValue]: lastOption.data,
            },
          },
        }) ||
        {};
      onChange(fromJS(value), metadata);
    } else {
      const option = selectedOption as RelationOption | null;
      this.setState({ initialOptions: [option].filter(Boolean) as RelationOption[] });
      const value = optionToString(option);
      const metadata = option && {
        [field.get('name') as string]: {
          [field.get('collection') as string]: { [value]: option.data },
        },
      };
      onChange(value, metadata);
    }
  };

  parseNestedFields = (hit: Hit, field: string): string => {
    const { locale } = this.props;
    const hitData =
      locale != null && hit.i18n != null && hit.i18n[locale] != null
        ? hit.i18n[locale].data
        : hit.data;
    const templateVars = stringTemplate.extractTemplateVars(field);
    // return non template fields as is
    if (templateVars.length <= 0) {
      return get(hitData, field) as string;
    }
    const data = stringTemplate.addFileTemplateFields(hit.path, fromJS(hitData) as Map<string, string>);
    const value = stringTemplate.compileStringTemplate(field, null, hit.slug, data);
    return value;
  };

  parseHitOptions = (hits: Hit[]): RelationOption[] => {
    const { field } = this.props;
    const valueField = field.get('value_field') as string;
    const displayField = (field.get('display_fields') || ImmutableList([field.get('value_field')])) as List<string>;
    const filters = getFieldArray(field.get('filters'));

    const options = hits.reduce((acc: RelationOption[], hit: Hit) => {
      if (
        filters.every((filter: unknown) => {
          // check if the value for the (nested) filter field is in the filter values
          const filterObj = filter as FilterObj;
          const fieldKeys = filterObj.field.split('.');
          let value: unknown = hit.data;
          for (let i = 0; i < fieldKeys.length; i++) {
            if (Object.prototype.hasOwnProperty.call(value, fieldKeys[i])) {
              value = (value as Record<string, unknown>)[fieldKeys[i]];
            } else {
              return false;
            }
          }
          return filterObj.values.includes(value);
        })
      ) {
        const valuesPaths = stringTemplate.expandPath({ data: hit.data, path: valueField });
        for (let i = 0; i < valuesPaths.length; i++) {
          const label = (displayField
            .toJS() as string[])
            .map((key: string) => {
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

  loadOptions = debounce((term: string, callback: (options: RelationOption[]) => void) => {
    const { field, query, forID } = this.props;
    const collection = field.get('collection') as string;
    const searchFieldsArray = getFieldArray(field.get('search_fields'));
    const file = field.get('file') as string | undefined;

    relationCache
      .getOptions(collection, searchFieldsArray, term, file, () =>
        query(forID, collection, searchFieldsArray, term, file),
      )
      .then((result: unknown) => {
        const queryResult = result as QueryResult;
        const hits = queryResult.payload.hits || [];
        const options = this.parseHitOptions(hits);
        const optionsLength = (field.get('options_length') || 20) as number;
        const uniq = uniqOptions(this.state.initialOptions, options).slice(0, optionsLength);
        callback(uniq);
      })
      .catch((error: unknown) => {
        console.error('Failed to load options:', error);
        callback([]);
      });
  }, 500);

  render() {
    const { value, field, forID, classNameWrapper, setActiveStyle, setInactiveStyle, queryHits } =
      this.props;
    const isMultiple = this.isMultiple();
    const isClearable = !field.get('required', true) || isMultiple;

    const queryOptions = this.parseHitOptions(queryHits || []);
    const options = uniqOptions(this.state.initialOptions, queryOptions);
    const selectedValue = getSelectedValue({
      options,
      value,
      isMultiple,
    });

    return (
      <SortableSelect
        useDragHandle
        onSortEnd={this.onSortEnd(selectedValue as RelationOption[])}
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
    );
  }
}
