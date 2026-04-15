import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { Map, List, fromJS } from 'immutable';
import find from 'lodash/find';
import Select from 'react-select';
import { reactSelectStyles } from 'decap-cms-ui-default';
import { validations } from 'decap-cms-lib-widgets';

import type { Map as ImmutableMap, List as ImmutableList } from 'immutable';

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
  return Map.isMap(raw) ? (raw as ImmutableMap<string, unknown>).toJS() as unknown as SelectOption : raw as SelectOption;
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
    const selectedOptions = List.isList(value) ? value.toJS() : value;

    if (!selectedOptions || !Array.isArray(selectedOptions)) {
      return null;
    }

    return selectedOptions
      .map((i: SelectOption | string | number) => options.find((o: SelectOption) => o.value === ((i as SelectOption).value || i)))
      .filter(Boolean)
      .map(convertToOption);
  } else {
    return find(options, ['value', value]) || null;
  }
}

interface SelectControlProps {
  onChange: (...args: unknown[]) => unknown;
  value?: ImmutableList<unknown> | string | number;
  forID: string;
  classNameWrapper: string;
  setActiveStyle: (...args: unknown[]) => unknown;
  setInactiveStyle: (...args: unknown[]) => unknown;
  field: ImmutableMap<string, unknown>;
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
    field: ImmutablePropTypes.contains({
      options: ImmutablePropTypes.listOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number,
          ImmutablePropTypes.contains({
            label: PropTypes.string.isRequired,
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          }),
        ]),
      ).isRequired,
    }),
  };

  isValid = () => {
    const { field, value, t } = this.props;
    const min = field.get('min') as number | undefined;
    const max = field.get('max') as number | undefined;

    if (!field.get('multiple')) {
      return { error: false };
    }

    const error = validations.validateMinMax(
      t,
      field.get('label', field.get('name')) as string,
      value as ImmutableList<unknown> | undefined,
      min,
      max,
    );

    return error ? { error } : { error: false };
  };

  handleChange = (selectedOption: readonly SelectOption[] | SelectOption | null) => {
    const { onChange, field } = this.props;
    const isMultiple = field.get('multiple', false) as boolean;
    const isEmpty = isMultiple
      ? !selectedOption || (Array.isArray(selectedOption) && selectedOption.length === 0)
      : !selectedOption;

    if (field.get('required') && isEmpty && isMultiple) {
      onChange(List());
    } else if (isEmpty) {
      onChange(null);
    } else if (isMultiple && Array.isArray(selectedOption)) {
      const options = selectedOption.map(optionToString);
      onChange(fromJS(options));
    } else if (selectedOption && !Array.isArray(selectedOption)) {
      onChange(optionToString(selectedOption as SelectOption));
    }
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(SelectControl.propTypes, this.props, 'prop', 'SelectControl');

    const { field, onChange, value } = this.props;
    if (field.get('required') && field.get('multiple')) {
      if (value && !List.isList(value)) {
        onChange(fromJS([value]));
      } else if (!value) {
        onChange(fromJS([]));
      }
    }
  }

  render() {
    const { field, value, forID, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
    const fieldOptions = field.get('options') as ImmutableList<unknown>;
    const isMultiple = field.get('multiple', false) as boolean;
    const isClearable = !field.get('required', true) || isMultiple;

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
        onChange={this.handleChange as (newValue: readonly SelectOption[] | SelectOption | null) => void}
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
