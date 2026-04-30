import React from 'react';
import PropTypes from 'prop-types';
import find from 'lodash/find';
import Select from 'react-select';
import { reactSelectStyles } from 'decap-cms-ui-default';
import { validations } from 'decap-cms-lib-widgets';
import type { CmsFieldSelect, CmsFieldBase } from 'decap-cms-lib-util';
import isObject from 'lodash/isObject';

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

function getSelectedValue({
  value,
  options,
  isMultiple,
}: {
  value: unknown;
  options: SelectOption[];
  isMultiple: boolean;
}): SelectOption | SelectOption[] | null {
  if (isMultiple) {
    if (value == null) return null;
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

interface SelectControlProps {
  onChange: (...args: unknown[]) => unknown;
  value?: string | number | (string | number)[];
  forID: string;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  field: CmsFieldSelect & CmsFieldBase;
  t: (key: string, options?: unknown) => string;
}

export default class SelectControl extends React.Component<SelectControlProps> {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.node,
    forID: PropTypes.string.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    field: PropTypes.shape({
      options: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number,
          PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          }),
        ]),
      ).isRequired,
    }),
  };

  isValid = () => {
    const { field, value, t } = this.props;
    const min = field.min;
    const max = field.max;

    if (!field.multiple) {
      return { error: false };
    }

    const error = validations.validateMinMax(
      t,
      field.label ?? field.name,
      value as (string | number)[] | undefined,
      min,
      max,
    );

    return error ? { error } : { error: false };
  };

  handleChange = (selectedOption: readonly SelectOption[] | SelectOption | null) => {
    const { onChange, field } = this.props;
    const isMultiple = field.multiple;
    const isEmpty = isMultiple
      ? !selectedOption || (Array.isArray(selectedOption) && selectedOption.length === 0)
      : !selectedOption;

    if (field.required && isEmpty && isMultiple) {
      onChange([]);
    } else if (isEmpty) {
      onChange(null);
    } else if (isMultiple && Array.isArray(selectedOption)) {
      const options = selectedOption.map(optionToString);
      onChange(options);
    } else if (selectedOption && !Array.isArray(selectedOption)) {
      onChange(optionToString(selectedOption as SelectOption));
    }
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(SelectControl.propTypes, this.props, 'prop', 'SelectControl');

    const { field, onChange, value } = this.props;
    if (field.required && field.multiple) {
      if (value && !Array.isArray(value)) {
        onChange([value]);
      } else if (!value) {
        onChange([]);
      }
    }
  }

  render() {
    const { field, value, forID, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const fieldOptions = field.options;
    const isMultiple = !!field.multiple;
    const isClearable = !field.required || isMultiple;

    const options: SelectOption[] = [...fieldOptions.map(convertToOption)];
    const selectedValue = getSelectedValue({
      options,
      value,
      isMultiple,
    });

    return (
      <Select<SelectOption, boolean>
        inputId={forID}
        value={selectedValue}
        onChange={
          this.handleChange as (newValue: readonly SelectOption[] | SelectOption | null) => void
        }
        className={classNameWrapper}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        options={options}
        styles={reactSelectStyles}
        isMulti={isMultiple}
        isClearable={isClearable}
        placeholder=""
      />
    );
  }
}
