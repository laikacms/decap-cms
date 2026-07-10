import React from 'react';

import type { TranslateFunction } from '../../ui/default/index';
import type { CmsFieldBase, CmsFieldNumber } from '../../lib/util/index';

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

export interface NumberControlProps {
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

export interface NumberControlHandle {
  isValid(): true | { error: { type: string; message: string } };
}

const NumberControl = React.forwardRef<NumberControlHandle, NumberControlProps>(
  function NumberControl(props, ref) {
    const {
      field,
      value = '',
      onChange,
      classNameWrapper,
      forID,
      setActiveStyle,
      setInactiveStyle,
    } = props;

    // Stable handle: read latest field/value/t through a ref so callers that
    // captured the handle once (e.g. in a test helper) keep working.
    const latestProps = React.useRef(props);
    latestProps.current = props;
    React.useImperativeHandle(
      ref,
      () => ({
        isValid() {
          const { field: f, value: v, t: tt } = latestProps.current;
          const valueType = f.value_type;

          // Detect unsafe integer: value is a non-empty string that looks like an
          // integer and is only present because parseInt rounded it to an unsafe
          // float (handleChange refused to store the rounded result).
          if (
            valueType !== 'float' &&
            typeof v === 'string' &&
            v !== '' &&
            /^-?\d+$/.test(v)
          ) {
            const parsed = parseInt(v, 10);
            if (!Number.isSafeInteger(parsed)) {
              return {
                error: {
                  type: ValidationErrorTypes.CUSTOM,
                  message:
                    'Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs.',
                },
              };
            }
          }

          // Detect float overflow: value is a non-empty string that is only
          // present because handleChange refused to store the non-finite
          // parseFloat result.
          if (valueType === 'float' && typeof v === 'string' && v !== '') {
            const parsed = parseFloat(v);
            if (!isNaN(parsed) && !isFinite(parsed)) {
              return {
                error: {
                  type: ValidationErrorTypes.CUSTOM,
                  message: 'Value exceeds the maximum representable number.',
                },
              };
            }
          }

          if (f.pattern) return true;
          const error = validateMinMax(
            v ?? '',
            (f.min ?? false) as number | false,
            (f.max ?? false) as number | false,
            f,
            tt,
          );
          return error ? { error } : true;
        },
      }),
      [],
    );

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const valueType = field.value_type;
      const raw = e.target.value;

      if (valueType === 'float') {
        const parsed = parseFloat(raw);
        if (isNaN(parsed)) {
          onChange('');
          return;
        }

        // Overflowing magnitudes (e.g. "1e309") parse to Infinity/-Infinity
        // without NaN, so store the raw string so isValid() can surface the
        // error without silently persisting a non-finite value, mirroring the
        // int path below.
        if (!isFinite(parsed)) {
          onChange(raw);
          return;
        }

        onChange(parsed);
        return;
      }

      const parsed = parseInt(raw, 10);
      if (isNaN(parsed)) {
        onChange('');
        return;
      }

      // Integers above Number.MAX_SAFE_INTEGER are silently rounded by
      // parseInt; store the raw string so isValid() can surface the error
      // without corrupting data.
      if (!Number.isSafeInteger(parsed)) {
        onChange(raw);
        return;
      }

      onChange(parsed);
    }

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
        onChange={handleChange}
      />
    );
  },
);

export default NumberControl;
