import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
const ValidationErrorTypes = {
  PRESENCE: 'PRESENCE',
  PATTERN: 'PATTERN',
  RANGE: 'RANGE',
  CUSTOM: 'CUSTOM',
};

export function validateMinMax(value, min, max, field, t) {
  let error;

  switch (true) {
    case value !== '' && min !== false && max !== false && (value < min || value > max):
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.range', {
          fieldLabel: field.get('label', field.get('name')),
          minValue: min,
          maxValue: max,
        }),
      };
      break;
    case value !== '' && min !== false && value < min:
      error = {
        type: ValidationErrorTypes.RANGE,
        message: t('editor.editorControlPane.widget.min', {
          fieldLabel: field.get('label', field.get('name')),
          minValue: min,
        }),
      };
      break;
    case value !== '' && max !== false && value > max:
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

export default class NumberControl extends React.Component {
  static propTypes = {
    field: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    classNameWrapper: PropTypes.string.isRequired,
    setActiveStyle: PropTypes.func.isRequired,
    setInactiveStyle: PropTypes.func.isRequired,
    value: PropTypes.node,
    forID: PropTypes.string,
    valueType: PropTypes.string,
    step: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf(['any'])]),
    min: PropTypes.number,
    max: PropTypes.number,
    slider: PropTypes.bool,
    t: PropTypes.func.isRequired,
  };

  static defaultProps = {
    value: '',
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(NumberControl.propTypes, this.props, 'prop', 'NumberControl');
  }

  handleChange = e => {
    const valueType = this.props.field.get('value_type');
    const { onChange } = this.props;
    const raw = e.target.value;

    // Only an explicit value_type: 'int' renders step="1" (see render() below);
    // every other case (explicit 'float' or unset) renders step="any" and must
    // parse with parseFloat so decimals typed into that input aren't truncated.
    if (valueType !== 'int') {
      const value = parseFloat(raw);
      if (isNaN(value)) {
        onChange('');
        return;
      }

      // Overflowing magnitudes (e.g. "1e309") parse to Infinity/-Infinity without
      // NaN, so store the raw string so isValid() can surface the error without
      // silently persisting a non-finite value, mirroring the int path below.
      if (!isFinite(value)) {
        onChange(raw);
        return;
      }

      // Integers above Number.MAX_SAFE_INTEGER are silently rounded by parseFloat too;
      // store the raw string so isValid() can surface the error without corrupting data,
      // mirroring the int path below.
      if (/^-?\d+$/.test(raw.trim()) && !Number.isSafeInteger(value)) {
        onChange(raw);
        return;
      }

      onChange(value);
      return;
    }

    const value = parseInt(raw, 10);
    if (isNaN(value)) {
      onChange('');
      return;
    }

    // Integers above Number.MAX_SAFE_INTEGER are silently rounded by parseInt;
    // store the raw string so isValid() can surface the error without corrupting data.
    if (!Number.isSafeInteger(value)) {
      onChange(raw);
      return;
    }

    onChange(value);
  };

  isValid = () => {
    const { field, value, t } = this.props;
    const min = field.get('min', false);
    const max = field.get('max', false);
    const valueType = field.get('value_type');

    // Detect unsafe integer: value is a non-empty string that looks like an integer
    // and is only present because parseInt rounded it to an unsafe float.
    if (valueType === 'int' && typeof value === 'string' && value !== '' && /^-?\d+$/.test(value)) {
      const parsed = parseInt(value, 10);
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

    // Detect float overflow: value is a non-empty string that is only present
    // because handleChange refused to store the non-finite parseFloat result.
    if (valueType !== 'int' && typeof value === 'string' && value !== '') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && !isFinite(parsed)) {
        return {
          error: {
            type: ValidationErrorTypes.CUSTOM,
            message: 'Value exceeds the maximum representable number.',
          },
        };
      }
    }

    // Detect unsafe integer typed into a float/unset value_type: value is a
    // non-empty string that looks like an integer and is only present because
    // handleChange refused to store the unsafe parseFloat result, mirroring
    // the int-path guard above.
    if (valueType !== 'int' && typeof value === 'string' && value !== '' && /^-?\d+$/.test(value)) {
      const parsed = parseFloat(value);
      if (isFinite(parsed) && !Number.isSafeInteger(parsed)) {
        return {
          error: {
            type: ValidationErrorTypes.CUSTOM,
            message:
              'Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs.',
          },
        };
      }
    }

    const error = validateMinMax(value, min, max, field, t);
    return error ? { error } : true;
  };

  render() {
    const { field, value, classNameWrapper, forID, setActiveStyle, setInactiveStyle } = this.props;
    const min = field.get('min', '');
    const max = field.get('max', '');
    const step = field.get('step', field.get('value_type') === 'int' ? 1 : 'any');
    const slider = field.get('slider', false);
    const numericValue = value || (value === 0 ? value : '');

    if (slider) {
      // `<input type="range">` can't be a controlled component with an empty
      // string value (it would warn and fall back to the browser default),
      // so an unset value falls back to `min` (or 0 when `min` is also
      // unset, matching the native range-input default) purely for the
      // slider thumb's position; the paired number input still shows the
      // real (possibly empty) value, and onChange/handleChange is untouched
      // either way.
      const sliderValue = numericValue === '' ? min || 0 : numericValue;
      return (
        <div className={classNameWrapper}>
          <input
            type="range"
            id={forID}
            onFocus={setActiveStyle}
            onBlur={setInactiveStyle}
            value={sliderValue}
            step={step}
            min={min}
            max={max}
            onChange={this.handleChange}
          />
          <input
            type="number"
            aria-label={field.get('label', field.get('name'))}
            onFocus={setActiveStyle}
            onBlur={setInactiveStyle}
            value={numericValue}
            step={step}
            min={min}
            max={max}
            onChange={this.handleChange}
          />
        </div>
      );
    }

    return (
      <input
        type="number"
        id={forID}
        className={classNameWrapper}
        onFocus={setActiveStyle}
        onBlur={setInactiveStyle}
        value={numericValue}
        step={step}
        min={min}
        max={max}
        onChange={this.handleChange}
      />
    );
  }
}
