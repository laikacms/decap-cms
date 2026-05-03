import React from 'react';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsFieldBase, CmsFieldNumber } from 'decap-cms-lib-util';

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
  field: CmsFieldNumber & CmsFieldBase,
  t: TranslateFunction,
) {
  let error;
  const numValue = Number(value);

  switch (true) {
    case value !== '' && min !== false && max !== false && (numValue < min || numValue > max):
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.range', {
          fieldLabel: field.label || field.name,
          minValue: min,
          maxValue: max,
        }),
      };
      break;
    case value !== '' && min !== false && numValue < min:
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.min', {
          fieldLabel: field.label || field.name,
          minValue: min,
        }),
      };
      break;
    case value !== '' && max !== false && numValue > max:
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.max', {
          fieldLabel: field.label || field.name,
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
  field: CmsFieldNumber & CmsFieldBase;
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
  static defaultProps = {
    value: '',
  };

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valueType = this.props.field.value_type;
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
    const hasPattern = !!field.pattern;
    const min = field.min ?? false;
    const max = field.max ?? false;

    // Pattern overrides min/max logic always:
    if (hasPattern) {
      return true;
    }

    const error = validateMinMax(
      value ?? '',
      min as number | false,
      max as number | false,
      field,
      t,
    );
    return error ? { error } : true;
  };

  render() {
    const { field, value, classNameWrapper, forID, setActiveStyle, setInactiveStyle } = this.props;
    const min = field.min ?? '';
    const max = field.max ?? '';
    const step = field.step ?? (field.value_type === 'int' ? 1 : '');
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
