
import { find, isObject } from 'lodash-es';
import React from 'react';

import { validations } from '@/lib/widgets/index';
import {
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
} from '@/ui';

import type { CmsFieldBase, CmsFieldSelect } from '@/lib/util/index';

interface SelectOption {
  label: string;
  value: string | number;
}

function optionToString(option: SelectOption | null | undefined): string | number | null {
  return option && (typeof option.value === 'number' || typeof option.value === 'string')
    ? option.value
    : null;
}

function convertToOption(raw: unknown): SelectOption {
  if (typeof raw === 'string') {
    return { label: raw, value: raw };
  }
  return isObject(raw) ? (raw as SelectOption) : (raw as SelectOption);
}

function isSameOption(a: SelectOption, b: SelectOption): boolean {
  return a.value === b.value;
}

function getSelectedValue({
  value,
  options,
  isMultiple,
}: {
  value: unknown,
  options: SelectOption[],
  isMultiple: boolean,
}): SelectOption | SelectOption[] | null {
  if (isMultiple) {
    // base-ui's Combobox root expects an array `value` whenever `multiple` is
    // true; passing `null` leaves its internal `selectedValue` state as
    // `null` instead of `[]`, which throws (`Cannot read properties of null
    // (reading 'length')`) the first time the empty input's keydown handler
    // reads `selectedValue.length` (e.g. on Backspace) (DCMS-1018 recurrence,
    // DCMS-1027).
    if (value == null) return [];
    const selectedOptions = Array.isArray(value) ? value : [value];

    return selectedOptions
      .map((i: SelectOption | string | number) => {
        const val = i != null && typeof i === 'object' ? (i as SelectOption).value : i;
        return options.find((o: SelectOption) => o.value === (val ?? i));
      })
      .filter(Boolean)
      .map(convertToOption);
  } else {
    return find(options, ['value', value]) || null;
  }
}

export interface SelectControlProps {
  onChange: (...args: unknown[]) => unknown;
  value?: string | number | (string | number)[];
  forID: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: CmsFieldSelect & CmsFieldBase;
  t: (key: string, options?: unknown) => string;
  hasErrors?: boolean;
  errorListId?: string;
}

export interface SelectControlHandle {
  isValid(): { error: false | { type: string, message: string } };
}

const SelectControl = React.forwardRef<SelectControlHandle, SelectControlProps>(
  function SelectControl(props, ref) {
    const {
      field,
      value,
      forID,
      classNameWrapper,
      setActiveStyle,
      setInactiveStyle,
      onChange,
      t,
      hasErrors,
      errorListId,
    } = props;

    // Read latest props from a ref so the imperative handle stays referentially
    // stable across renders. Callers that captured the ref once (e.g. in a test
    // helper) can keep using it; isValid always sees the current value.
    const latestProps = React.useRef(props);
    latestProps.current = props;
    React.useImperativeHandle(
      ref,
      () => ({
        isValid() {
          const { field: f, value: v, t: tt } = latestProps.current;
          if (!f.multiple) return { error: false };
          const error = validations.validateMinMax(
            tt,
            f.label ?? f.name,
            v as (string | number)[] | undefined,
            f.min,
            f.max,
          );
          return error ? { error } : { error: false };
        },
      }),
      [],
    );

    React.useEffect(() => {
      if (field.required && field.multiple) {
        if (value && !Array.isArray(value)) {
          onChange([value]);
        } else if (!value) {
          onChange([]);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror componentDidMount
    }, []);

    function handleChange(selectedOption: readonly SelectOption[] | SelectOption | null) {
      const isMultiple = field.multiple;
      const isEmpty = isMultiple
        ? !selectedOption || (Array.isArray(selectedOption) && selectedOption.length === 0)
        : !selectedOption;

      if (field.required && isEmpty && isMultiple) {
        onChange([]);
      } else if (isEmpty) {
        onChange(null);
      } else if (isMultiple && Array.isArray(selectedOption)) {
        onChange(selectedOption.map(optionToString));
      } else if (selectedOption && !Array.isArray(selectedOption)) {
        onChange(optionToString(selectedOption as SelectOption));
      }
    }

    const fieldOptions = field.options;
    const isMultiple = !!field.multiple;
    const isClearable = !field.required || isMultiple;

    const options: SelectOption[] = [...fieldOptions.map(convertToOption)];
    const selectedValue = getSelectedValue({ options, value, isMultiple });
    const selectedList = isMultiple ? ((selectedValue as SelectOption[] | null) ?? []) : [];
    const inputAriaProps = {
      'aria-required': field.required !== false,
      'aria-invalid': hasErrors || undefined,
      'aria-errormessage': hasErrors ? errorListId : undefined,
    };

    return (
      <div className={classNameWrapper}>
        <Combobox<SelectOption, boolean>
          multiple={isMultiple}
          items={options}
          value={selectedValue as SelectOption | SelectOption[] | null}
          onValueChange={value => handleChange(value as readonly SelectOption[] | SelectOption | null)}
          isItemEqualToValue={isSameOption}
          openOnInputClick
        >
          <ComboboxInputGroup onFocus={setActiveStyle} onBlur={setInactiveStyle}>
            {isMultiple && (
              <ComboboxChips>
                {selectedList.map(option => (
                  <ComboboxChip key={option.value}>
                    {option.label}
                    <ComboboxChipRemove />
                  </ComboboxChip>
                ))}
                <ComboboxInput id={forID} placeholder="" {...inputAriaProps} />
              </ComboboxChips>
            )}
            {!isMultiple && <ComboboxInput id={forID} placeholder="" {...inputAriaProps} />}
            {isClearable && <ComboboxClear />}
            <ComboboxIcon />
          </ComboboxInputGroup>
          <ComboboxPortal>
            <ComboboxPositioner sideOffset={4}>
              <ComboboxPopup>
                <ComboboxEmpty>No options</ComboboxEmpty>
                <ComboboxList>
                  {(option: SelectOption) => (
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
    );
  },
);

export default SelectControl;
