import { debounce, find, get, isEmpty, last, uniqBy } from 'lodash-es';
import React from 'react';
import { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import { List as VirtualList } from 'react-window';

import { stringTemplate, validations } from '@/lib/widgets/index';
import { colors, reactSelectStyles, SortableArea, SortableItem } from '@/ui/default/index';
import relationCache from './RelationCache';

import type { CmsFieldBase, CmsFieldRelation } from '@/lib/util/index';
import type { CSSProperties, ReactElement } from 'react';
import type { GroupBase, MultiValueProps } from 'react-select';

interface RelationOption {
  label: string;
  value: string;
  data?: Record<string, unknown>;
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
    hits: Hit[],
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
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  const innerProps = { ...props.innerProps, onMouseDown };
  return (
    <SortableItem index={props.index}>
      {(ref, { isDragging, isOver }) => (
        <div
          ref={ref}
          style={{
            opacity: isDragging ? 0.5 : undefined,
            outline: isOver ? `2px solid ${colors.active}` : undefined,
          }}
        >
          <components.MultiValue {...props} innerProps={innerProps} />
        </div>
      )}
    </SortableItem>
  );
}

function SortableSelect(props: Record<string, unknown>) {
  const { onSortEnd, isMulti } = props as {
    onSortEnd: (args: { oldIndex: number, newIndex: number }) => void,
    isMulti: boolean,
  };

  if (!isMulti) {
    return <AsyncSelect {...(props as React.ComponentProps<typeof AsyncSelect>)} />;
  }

  return (
    <SortableArea onSortEnd={onSortEnd}>
      <AsyncSelect {...(props as React.ComponentProps<typeof AsyncSelect>)} />
    </SortableArea>
  );
}

interface OptionRowProps {
  options: React.ReactNode[];
}

function OptionRow(
  props: {
    ariaAttributes: { 'aria-posinset': number, 'aria-setsize': number, role: 'listitem' },
    index: number,
    style: CSSProperties,
  } & OptionRowProps,
): ReactElement | null {
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
  return raw as RelationOption;
}

function getSelectedOptions(value: unknown): RelationOption[] | null {
  const selectedOptions = value;
  if (!selectedOptions || !Array.isArray(selectedOptions)) {
    return null;
  }
  return selectedOptions as RelationOption[];
}

function uniqOptions(initial: RelationOption[], current: RelationOption[]): RelationOption[] {
  return uniqBy(initial.concat(current), (o: RelationOption) => o.value);
}

function getFieldArray(field: unknown): string[] {
  if (!field) return [];
  return Array.isArray(field) ? (field as string[]) : [field as string];
}

function getSelectedValue({
  value,
  options,
  isMultiple,
}: {
  value: unknown,
  options: RelationOption[],
  isMultiple: boolean,
}): RelationOption[] | RelationOption | null {
  if (isMultiple) {
    const selectedOptions = getSelectedOptions(value);
    if (selectedOptions === null) return null;

    return selectedOptions
      .map((i: RelationOption) => options.find((o: RelationOption) => o.value === (i.value || i)))
      .filter(Boolean) as RelationOption[];
  }
  return find(options, ['value', value]) || null;
}

export interface RelationControlProps {
  onChange: (...args: unknown[]) => unknown;
  forID: string;
  value?: unknown | unknown[];
  field: CmsFieldRelation & CmsFieldBase;
  query: (...args: unknown[]) => Promise<QueryResult>;
  queryHits?: Hit[];
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  locale?: string;
  hasActiveStyle?: boolean;
  t: (key: string, options?: unknown) => string;
}

export interface RelationControlHandle {
  isValid(): { error: false | { type: string, message: string } };
}

const RelationControl = React.forwardRef<RelationControlHandle, RelationControlProps>(
  function RelationControl(props, ref) {
    const {
      value,
      field,
      forID,
      classNameWrapper,
      setActiveStyle,
      setInactiveStyle,
      queryHits,
      query,
      onChange,
      locale,
    } = props;

    const [initialOptions, setInitialOptions] = React.useState<RelationOption[]>([]);
    const mountedRef = React.useRef(false);

    function isMultiple(): boolean {
      return !!field.multiple;
    }

    function hasInitialValues(v: unknown): boolean {
      if (isMultiple()) {
        const selectedOptions = getSelectedOptions(v);
        return selectedOptions !== null && selectedOptions.length > 0;
      }
      return v !== undefined && v !== null && v !== '';
    }

    function parseNestedFields(hit: Hit, fieldName: string): string {
      const hitData = locale != null && hit.i18n != null && hit.i18n[locale] != null
        ? hit.i18n[locale].data
        : hit.data;
      const templateVars = stringTemplate.extractTemplateVars(fieldName);
      if (templateVars.length <= 0) {
        return get(hitData, fieldName) as string;
      }
      const data = stringTemplate.addFileTemplateFields(hit.path, { ...hitData } as Record<
        string,
        string
      >);
      return stringTemplate.compileStringTemplate(fieldName, null, hit.slug, data);
    }

    function parseHitOptions(hits: Hit[]): RelationOption[] {
      const valueField = field.value_field as string;
      const displayField = (field.display_fields || [field.value_field]) as string[];
      const filters = getFieldArray(field.filters);

      return hits.reduce((acc: RelationOption[], hit: Hit) => {
        if (
          filters.every((filter: unknown) => {
            const filterObj = filter as FilterObj;
            const fieldKeys = filterObj.field.split('.');
            let v: unknown = hit.data;
            for (let i = 0; i < fieldKeys.length; i++) {
              if (Object.prototype.hasOwnProperty.call(v, fieldKeys[i])) {
                v = (v as Record<string, unknown>)[fieldKeys[i]];
              } else {
                return false;
              }
            }
            return filterObj.values.includes(v);
          })
        ) {
          const valuesPaths = stringTemplate.expandPath({ data: hit.data, path: valueField });
          for (let i = 0; i < valuesPaths.length; i++) {
            const label = displayField
              .map((key: string) => {
                const displayPaths = stringTemplate.expandPath({ data: hit.data, path: key });
                return parseNestedFields(hit, displayPaths[i] || displayPaths[0]);
              })
              .join(' ');
            const v = parseNestedFields(hit, valuesPaths[i]);
            acc.push({ data: hit.data, value: v, label });
          }
        }
        return acc;
      }, []);
    }

    // Stable handle: read latest value/field/t via ref so callers that captured
    // the handle once keep seeing current values.
    const validateRefs = React.useRef({ value, field, t: props.t });
    validateRefs.current = { value, field, t: props.t };
    React.useImperativeHandle(
      ref,
      () => ({
        isValid() {
          const { value: v, field: f, t: tt } = validateRefs.current;
          if (!f.multiple) return { error: false };
          if (Array.isArray(v)) {
            const error = validations.validateMinMax(tt, f.label ?? f.name, v, f.min, f.max);
            return error ? { error } : { error: false };
          }
          return { error: false };
        },
      }),
      [],
    );

    function triggerInitialOnChange(v: unknown, options: RelationOption[]) {
      if (isMultiple()) {
        const selectedOptions = getSelectedOptions(v);
        if (selectedOptions && selectedOptions.length > 0) {
          const matchedOptions = selectedOptions
            .map((val: RelationOption) => options.find((opt: RelationOption) => opt.value === (val.value || val)))
            .filter(Boolean) as RelationOption[];

          if (matchedOptions.length > 0) {
            const metadata = {
              [field.name]: {
                [field.collection]: matchedOptions.reduce(
                  (acc: Record<string, unknown>, option: RelationOption) => ({
                    ...acc,
                    [option.value]: option.data,
                  }),
                  {},
                ),
              },
            };
            onChange(v, metadata);
          }
        }
      } else {
        const matchedOption = options.find((opt: RelationOption) => opt.value === v);
        if (matchedOption) {
          const metadata = {
            [field.name]: {
              [field.collection]: {
                [matchedOption.value]: matchedOption.data,
              },
            },
          };
          onChange(v, metadata);
        }
      }
    }

    // Mount-only initial options load. Uses refs to avoid re-firing when value
    // changes and to always see the latest props inside the async callback.
    const initialLoadRef = React.useRef({
      value,
      field,
      forID,
      query,
      onChange,
      hasInitialValues,
      parseHitOptions,
      triggerInitialOnChange,
    });
    initialLoadRef.current = {
      value,
      field,
      forID,
      query,
      onChange,
      hasInitialValues,
      parseHitOptions,
      triggerInitialOnChange,
    };

    React.useEffect(() => {
      mountedRef.current = true;
      const {
        value: v,
        field: f,
        forID: id,
        query: q,
        hasInitialValues: hiv,
        parseHitOptions: pho,
        triggerInitialOnChange: tioc,
      } = initialLoadRef.current;

      if (v && hiv(v)) {
        (async () => {
          const collection = f.collection;
          const searchFieldsArray = getFieldArray(f.search_fields);
          const file = f.file;
          try {
            const result = (await relationCache.getOptions(
              collection,
              searchFieldsArray,
              '',
              file,
              () => q(id, collection, searchFieldsArray, '', file),
            )) as QueryResult;

            const hits = result.payload.hits || [];
            const options = pho(hits);

            if (mountedRef.current) {
              setInitialOptions(options);
              if (v && hiv(v)) {
                tioc(v, options);
              }
            }
          } catch (error) {
            console.error('Failed to load initial options:', error);
          }
        })();
      }

      return () => {
        mountedRef.current = false;
      };
    }, []);

    function onSortEnd(options: RelationOption[]) {
      return ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
        const v = options.map(optionToString);
        const newValue = arrayMove(v, oldIndex, newIndex);
        const lastOption = last(options);
        const lastValue = last(newValue);
        const metadata = (!isEmpty(options)
          && lastOption
          && lastValue && {
          [field.name]: {
            [field.collection]: {
              [lastValue]: lastOption.data,
            },
          },
        })
          || {};
        onChange(newValue, metadata);
      };
    }

    function handleChange(selectedOption: RelationOption | RelationOption[] | null) {
      if (isMultiple()) {
        const options = (selectedOption || []) as RelationOption[];
        setInitialOptions(options.filter(Boolean));
        const v = options.map(optionToString);
        const lastOption = last(options);
        const lastValue = last(v);
        const metadata = (!isEmpty(options)
          && lastOption
          && lastValue && {
          [field.name]: {
            [field.collection]: {
              [lastValue]: lastOption.data,
            },
          },
        })
          || {};
        onChange(v, metadata);
      } else {
        const option = selectedOption as RelationOption | null;
        setInitialOptions([option].filter(Boolean) as RelationOption[]);
        const v = optionToString(option);
        const metadata = option && {
          [field.name]: {
            [field.collection]: { [v]: option.data },
          },
        };
        onChange(v, metadata);
      }
    }

    // Keep loadOptions stable across renders. It reads latest props/state via
    // refs.
    const loadOptionsCtxRef = React.useRef({
      field,
      query,
      forID,
      initialOptions,
      parseHitOptions,
    });
    loadOptionsCtxRef.current = { field, query, forID, initialOptions, parseHitOptions };

    const loadOptions = React.useMemo(
      () =>
        debounce((term: string, callback: (options: RelationOption[]) => void) => {
          const {
            field: f,
            query: q,
            forID: id,
            initialOptions: io,
            parseHitOptions: pho,
          } = loadOptionsCtxRef.current;
          const collection = f.collection;
          const searchFieldsArray = getFieldArray(f.search_fields);
          const file = f.file as string | undefined;

          relationCache
            .getOptions(
              collection,
              searchFieldsArray,
              term,
              file,
              () => q(id, collection, searchFieldsArray, term, file),
            )
            .then((result: unknown) => {
              const queryResult = result as QueryResult;
              const hits = queryResult.payload.hits || [];
              const options = pho(hits);
              const optionsLength = (f.options_length || 20) as number;
              const uniq = uniqOptions(io, options).slice(0, optionsLength);
              callback(uniq);
            })
            .catch((error: unknown) => {
              console.error('Failed to load options:', error);
              callback([]);
            });
        }, 500),
      [],
    );

    const isMulti = isMultiple();
    const isClearable = !field.required || isMulti;
    const queryOptions = parseHitOptions(queryHits || []);
    const options = uniqOptions(initialOptions, queryOptions);
    const selectedValue = getSelectedValue({ options, value, isMultiple: isMulti });

    return (
      <SortableSelect
        onSortEnd={onSortEnd(selectedValue as RelationOption[])}
        components={{ MenuList, MultiValue }}
        value={selectedValue}
        inputId={forID}
        cacheOptions
        defaultOptions
        loadOptions={loadOptions}
        onChange={handleChange}
        className={classNameWrapper}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        styles={reactSelectStyles}
        isMulti={isMulti}
        isClearable={isClearable}
        placeholder=""
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
      />
    );
  },
);

export default RelationControl;
