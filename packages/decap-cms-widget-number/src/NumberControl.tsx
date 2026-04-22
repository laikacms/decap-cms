import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { Map as ImmutableMap } from 'immutable';

const ValidationErrorTypes = {
  PRESENCE: 'PRESENCE',
  PATTERN: 'PATTERN',
  RANGE: 'RANGE',
  CUSTOM: 'CUSTOM',
};

export function validateMinMax(
  value: string | number,
  min: number | false,
  max: number | false,
  field: ImmutableMap<string, unknown>,
  t: TranslateFunction,
) {
  let error;
  const numValue = Number(value);

  switch (true) {
    case value !== '' && min !== false && max !== false && (numValue < min || numValue > max):
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.range', {
          fieldLabel: field.get('label', field.get('name')),
          minValue: min,
          maxValue: max,
        }),
      };
      break;
    case value !== '' && min !== false && numValue < min:
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.min', {
          fieldLabel: field.get('label', field.get('name')),
          minValue: min,
        }),
      };
      break;
    case value !== '' && max !== false && numValue > max:
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.max', {
          fieldLabel: field.get('label', field.get('name')),
          maxValue: max,
        }),
      };
      break;
    default:
      error = null;
      break;
  }

  return error;
}

interface NumberControlProps {
  field: ImmutableMap<string, unknown>;
  onChange: (...args: unknown[]) => unknown;
  classNameWrapper: string;
  setActiveStyle: () => void;
  setInactiveStyle: () => void;
  value?: string | number;
  forID?: string;
  valueType?: string;
  step?: number;
  min?: number;
  max?: number;
  t: TranslateFunction;
}

export default class NumberControl extends React.Component<NumberControlProps> {
  static propTypes = {
    field: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    value: PropTypes.node,
    forID: PropTypes.string,
    valueType: PropTypes.string,
    step: PropTypes.number,
    min: PropTypes.number,
    max: PropTypes.number,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    value: '',
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(NumberControl.propTypes, this.props, 'prop', 'NumberControl');
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valueType = this.props.field.get('value_type');
    const { onChange } = this.props;
    const value = valueType === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      onChange(value);
    } else {
      onChange('');
    }
  };

  isValid = () => {
    const { field, value, t } = this.props;
    const hasPattern = !!field.get('pattern', false);
    const min = field.get('min', false);
    const max = field.get('max', false);

    // Pattern overrides min/max logic always:
    if (hasPattern) {
      return true;
    }

    const error = validateMinMax(value ?? '', min as number | false, max as number | false, field, t);
    return error ? { error } : true;
  };

  render() {
    const { field, value, classNameWrapper, forID, setActiveStyle, setInactiveStyle } = this.props;
    const min = field.get('min', '') as string | number;
    const max = field.get('max', '') as string | number;
    const step = field.get('step', field.get('value_type') === 'int' ? 1 : '') as string | number;
    return (
      <input
        type="number"
        id={forID}
        className={classNameWrapper}
        onFocus={setActiveStyle as React.FocusEventHandler<HTMLInputElement>}
        onBlur={setInactiveStyle as React.FocusEventHandler<HTMLInputElement>}
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        onChange={this.handleChange}
      />
    );
  }
}
