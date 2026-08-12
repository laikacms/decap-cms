import { debounce, find, get, isEmpty, last, uniqBy } from 'lodash-es';
import React from 'react';

import queryCore, { collectionTag } from '@/lib/util/queryCore';
import { stringTemplate, validations } from '@/lib/widgets/index';
import {
  Button,
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxStatus,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/ui';
import { SortableArea, SortableHandle, SortableItem } from '@/ui/default/index';

import type { CmsFieldBase, CmsFieldRelation } from '@/lib/util/index';

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

function isSameOption(a: RelationOption, b: RelationOption): boolean {
  return a.value === b.value;
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

// `value_field`/`search_fields` and their camelCase equivalents
// (`valueField`/`searchFields`) are both accepted by schema.ts's `oneOf` and
// documented in README.md as interchangeable, so the control must resolve
// either naming convention rather than only the snake_case one (DCMS-1458).
function getValueField(field: CmsFieldRelation & CmsFieldBase): string {
  return (field.value_field ?? field.valueField) as string;
}

function getSearchFieldsArray(field: CmsFieldRelation & CmsFieldBase): string[] {
  return getFieldArray(field.search_fields ?? field.searchFields);
}

// `display_fields`/`options_length` and their camelCase equivalents
// (`displayFields`/`optionsLength`) are both accepted by schema.ts's `oneOf`,
// same as `value_field`/`search_fields` above (DCMS-1903).
function getDisplayFields(field: CmsFieldRelation & CmsFieldBase, valueField: string): string[] {
  return (field.display_fields ?? field.displayFields ?? [valueField]) as string[];
}

function getOptionsLength(field: CmsFieldRelation & CmsFieldBase): number {
  return (field.options_length ?? field.optionsLength ?? 20) as number;
}

/**
 * Field keys usable in the quick-add minimal-fields form (DCMS-1421): plain
 * top-level field names only. Templated (`{{...}}`) or dotted/nested paths
 * can't be mapped back to a single input the way `value_field`/
 * `display_fields` can be resolved for an existing, already-saved hit, so
 * they're left out here.
 */
function isSimpleFieldKey(key: string): boolean {
  return typeof key === 'string' && key.length > 0 && !key.includes('.') && !key.includes('{{');
}

/**
 * The set of field names the quick-add form should collect: the relation's
 * `value_field` plus its `display_fields`, deduplicated, restricted to
 * `isSimpleFieldKey`. Exported for testing.
 */
export function getQuickAddFieldNames(field: CmsFieldRelation & CmsFieldBase): string[] {
  const valueField = getValueField(field);
  const displayFields = getDisplayFields(field, valueField);
  const candidates = [valueField, ...displayFields].filter(isSimpleFieldKey);
  return Array.from(new Set(candidates));
}

/**
 * Turns the plain `data` object returned by a successful quick-add persist
 * into the same `{ label, value, data }` option shape hits from search
 * results carry, so it can be selected via the normal `handleChange` path.
 * Restricted to `isSimpleFieldKey`-eligible fields (see
 * `getQuickAddFieldNames`), so a direct property read is sufficient - no
 * template expansion needed.
 */
export function buildQuickAddOption(
  field: CmsFieldRelation & CmsFieldBase,
  data: Record<string, unknown>,
): RelationOption {
  const valueField = getValueField(field);
  const displayFields = getDisplayFields(field, valueField);
  const value = String(data[valueField] ?? '');
  const label = displayFields
    .map(key => String(data[key] ?? ''))
    .join(' ')
    .trim() || value;
  return { data, value, label };
}

function relationOptionsKey(
  collection: string,
  searchFields: string[],
  term: string,
  file: string | undefined,
) {
  return `relation-options/${collection}/${searchFields.join(',')}/${term || ''}/${file || ''}`;
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
    // base-ui's Combobox root expects an array `value` whenever `multiple` is
    // true; passing `null` leaves its internal `selectedValue` state as
    // `null` instead of `[]`, which throws (`Cannot read properties of null
    // (reading 'length')`) the first time the empty input's keydown handler
    // reads `selectedValue.length` (e.g. on Backspace) (DCMS-1018).
    if (selectedOptions === null) return [];

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
  onQuickCreateEntry?: (
    collectionName: string,
    data: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  queryHits?: Hit[];
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  locale?: string;
  hasActiveStyle?: boolean;
  t: (key: string, options?: unknown) => string;
  hasErrors?: boolean;
  errorListId?: string;
  hintId?: string;
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
      hasErrors,
      errorListId,
      hintId,
      onQuickCreateEntry,
      t,
    } = props;

    const [initialOptions, setInitialOptions] = React.useState<RelationOption[]>([]);
    const [searchOptions, setSearchOptions] = React.useState<RelationOption[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [quickAdd, setQuickAdd] = React.useState<{
      values: Record<string, string>,
      submitting: boolean,
      error: string | null,
    } | null>(null);
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
      const valueField = getValueField(field);
      const displayField = getDisplayFields(field, valueField);
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
          const searchFieldsArray = getSearchFieldsArray(f);
          const file = f.file;
          try {
            const result = (await queryCore.fetch(
              relationOptionsKey(collection, searchFieldsArray, '', file),
              () => q(id, collection, searchFieldsArray, '', file),
              { tags: [collectionTag(collection)], keepValue: true },
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
        debounce((term: string) => {
          const {
            field: f,
            query: q,
            forID: id,
            initialOptions: io,
            parseHitOptions: pho,
          } = loadOptionsCtxRef.current;
          const collection = f.collection;
          const searchFieldsArray = getSearchFieldsArray(f);
          const file = f.file as string | undefined;

          setIsLoading(true);
          queryCore
            .fetch(
              relationOptionsKey(collection, searchFieldsArray, term, file),
              () => q(id, collection, searchFieldsArray, term, file),
              { tags: [collectionTag(collection)], keepValue: true },
            )
            .then((result: unknown) => {
              if (!mountedRef.current) return;
              const queryResult = result as QueryResult;
              const hits = queryResult.payload.hits || [];
              const options = pho(hits);
              const optionsLength = getOptionsLength(f);
              const uniq = uniqOptions(io, options).slice(0, optionsLength);
              setSearchOptions(uniq);
              setIsLoading(false);
            })
            .catch((error: unknown) => {
              console.error('Failed to load options:', error);
              if (!mountedRef.current) return;
              setSearchOptions([]);
              setIsLoading(false);
            });
        }, 500),
      [],
    );

    // Load the default (unfiltered) options once on mount, mirroring
    // react-select-async's `defaultOptions` behavior.
    React.useEffect(() => {
      loadOptions('');
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only default options load
    }, []);

    const isMulti = isMultiple();
    const isClearable = !field.required || isMulti;
    const inputAriaProps = {
      'aria-required': field.required !== false,
      'aria-invalid': hasErrors || undefined,
      'aria-errormessage': hasErrors ? errorListId : undefined,
      'aria-describedby': hintId,
    };
    const queryOptions = parseHitOptions(queryHits || []);
    const baseOptions = uniqOptions(initialOptions, queryOptions);
    const options = searchOptions === null ? baseOptions : uniqOptions(initialOptions, searchOptions);
    const selectedValue = getSelectedValue({ options, value, isMultiple: isMulti });
    const selectedList = isMulti ? ((selectedValue as RelationOption[] | null) ?? []) : [];

    function handleInputValueChange(inputValue: string) {
      loadOptions(inputValue);
    }

    // Opt-in "create new entry inline" (DCMS-1421). Gated on both the
    // field's `allow_quick_add`/`allowQuickAdd` config and the caller
    // actually wiring up `onQuickCreateEntry` (nested/object-list relation
    // instances or older host apps may not).
    const canQuickAdd = Boolean(onQuickCreateEntry) && Boolean(field.allow_quick_add ?? field.allowQuickAdd);

    function openQuickAdd() {
      const values: Record<string, string> = {};
      getQuickAddFieldNames(field).forEach(name => {
        values[name] = '';
      });
      setQuickAdd({ values, submitting: false, error: null });
    }

    function closeQuickAdd() {
      setQuickAdd(null);
    }

    function updateQuickAddValue(name: string, fieldValue: string) {
      setQuickAdd(state => (state ? { ...state, values: { ...state.values, [name]: fieldValue } } : state));
    }

    // Selects a freshly quick-added entry in place, reusing the normal
    // `handleChange` path so metadata/onChange behave exactly as they would
    // for a search result the user picked from the dropdown.
    function selectQuickAddOption(option: RelationOption) {
      if (isMultiple()) {
        const pool = uniqOptions(initialOptions, [option]);
        const currentSelected
          = (getSelectedValue({ options: pool, value, isMultiple: true }) as RelationOption[] | null) ?? [];
        handleChange([...currentSelected, option]);
      } else {
        handleChange(option);
      }
    }

    async function submitQuickAdd(event: React.FormEvent) {
      event.preventDefault();
      if (!onQuickCreateEntry || !quickAdd || quickAdd.submitting) {
        return;
      }

      setQuickAdd(state => (state ? { ...state, submitting: true, error: null } : state));

      try {
        const data = await onQuickCreateEntry(field.collection, quickAdd.values);
        if (!mountedRef.current) return;
        const option = buildQuickAddOption(field, data);
        selectQuickAddOption(option);
        setQuickAdd(null);
      } catch (error) {
        if (!mountedRef.current) return;
        const message = error instanceof Error ? error.message : String(error);
        setQuickAdd(state => (state ? { ...state, submitting: false, error: message } : state));
      }
    }

    const chipList = (
      <>
        {selectedList.map((option, index) => (
          <SortableItem key={option.value} index={index} withHandle>
            {(sortableRef, { isDragging }) => (
              <ComboboxChip
                ref={sortableRef as React.Ref<HTMLDivElement>}
                style={{ opacity: isDragging ? 0.5 : undefined }}
              >
                <SortableHandle>{option.label}</SortableHandle>
                <ComboboxChipRemove />
              </ComboboxChip>
            )}
          </SortableItem>
        ))}
        <ComboboxInput id={forID} placeholder="" {...inputAriaProps} />
      </>
    );

    return (
      <>
        <div className={classNameWrapper}>
        <Combobox<RelationOption, boolean>
          multiple={isMulti}
          items={options}
          filter={null}
          value={selectedValue as RelationOption | RelationOption[] | null}
          onValueChange={selected => handleChange(selected as RelationOption | RelationOption[] | null)}
          onInputValueChange={handleInputValueChange}
          isItemEqualToValue={isSameOption}
          openOnInputClick
        >
          <ComboboxInputGroup onFocus={setActiveStyle} onBlur={setInactiveStyle}>
            {isMulti
              ? (
                <SortableArea onSortEnd={onSortEnd(selectedList)}>
                  <ComboboxChips>{chipList}</ComboboxChips>
                </SortableArea>
              )
              : <ComboboxInput id={forID} placeholder="" {...inputAriaProps} />}
            {isClearable && <ComboboxClear />}
            <ComboboxIcon />
          </ComboboxInputGroup>
          <ComboboxPortal>
            <ComboboxPositioner sideOffset={4}>
              <ComboboxPopup>
                <ComboboxStatus>{isLoading ? 'Loading…' : null}</ComboboxStatus>
                <ComboboxEmpty>{isLoading ? 'Loading…' : 'No options'}</ComboboxEmpty>
                <ComboboxList>
                  {(option: RelationOption) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </ComboboxPositioner>
          </ComboboxPortal>
        </Combobox>
        </div>
        {canQuickAdd && (
          <Button type="button" variant="outline" size="sm" onClick={openQuickAdd} css={{ marginTop: 8 }}>
            {t
              ? t('widget.relation.quickAdd.action', { collection: field.collection })
              : `+ Create new ${field.collection}`}
          </Button>
        )}
        {quickAdd && (
          <Dialog
            open
            onOpenChange={open => {
              if (!open) closeQuickAdd();
            }}
          >
            <DialogContent>
              <form onSubmit={submitQuickAdd}>
                <DialogHeader>
                  <DialogTitle>
                    {t
                      ? t('widget.relation.quickAdd.title', { collection: field.collection })
                      : `Create new ${field.collection}`}
                  </DialogTitle>
                </DialogHeader>
                {Object.keys(quickAdd.values).map(name => (
                  <div key={name}>
                    <Label htmlFor={`quick-add-${forID}-${name}`}>{name}</Label>
                    <Input
                      id={`quick-add-${forID}-${name}`}
                      value={quickAdd.values[name]}
                      disabled={quickAdd.submitting}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateQuickAddValue(name, event.target.value)}
                    />
                  </div>
                ))}
                {quickAdd.error && <p role="alert">{quickAdd.error}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeQuickAdd} disabled={quickAdd.submitting}>
                    {t ? t('widget.relation.quickAdd.cancel') : 'Cancel'}
                  </Button>
                  <Button type="submit" disabled={quickAdd.submitting}>
                    {t ? t('widget.relation.quickAdd.save') : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  },
);

export default RelationControl;
