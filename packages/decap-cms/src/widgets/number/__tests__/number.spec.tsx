import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DecapCmsWidgetNumber } from '@/widgets/number';
import { validateMinMax } from '@/widgets/number/NumberControl';

const NumberControl = DecapCmsWidgetNumber.controlComponent;

const fieldSettings = {
  min: -20,
  max: 20,
  step: 1,
  value_type: 'int',
};

class NumberController extends React.Component {
  state = {
    value: this.props.defaultValue,
  };

  handleOnChange = vi.fn(value => {
    this.setState({ value });
  });

  componentDidUpdate() {
    this.props.onStateChange(this.state);
  }

  render() {
    return this.props.children({
      value: this.state.value,
      handleOnChange: this.handleOnChange,
    });
  }
}

function setup({ field, defaultValue }) {
  let renderArgs;
  let ref;
  const stateChangeSpy = vi.fn();
  const setActiveSpy = vi.fn();
  const setInactiveSpy = vi.fn();
  const t = vi.fn(key => key);

  const helpers = render(
    <NumberController defaultValue={defaultValue} onStateChange={stateChangeSpy}>
      {({ value, handleOnChange }) => {
        renderArgs = { value, onChangeSpy: handleOnChange };
        return (
          <NumberControl
            ref={widgetRef => (ref = widgetRef)}
            field={field}
            value={value}
            onChange={handleOnChange}
            forID="test-number"
            classNameWrapper=""
            setActiveStyle={setActiveSpy}
            setInactiveStyle={setInactiveSpy}
            t={t}
          />
        );
      }}
    </NumberController>,
  );

  const input = helpers.container.querySelector('input');

  return {
    ...helpers,
    ...renderArgs,
    stateChangeSpy,
    setActiveSpy,
    setInactiveSpy,
    input,
    ref: () => ref,
  };
}

describe('Number widget', () => {
  it('should call onChange when input changes', () => {
    const field = fieldSettings;
    const testValue = Math.floor(Math.random() * (20 - -20 + 1)) + -20;
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(testValue);
  });

  it('should call onChange with empty string when no value is set', () => {
    const field = fieldSettings;
    const { input, onChangeSpy } = setup({ field, defaultValue: 20 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith('');
  });

  it('should call onChange with empty string when a non numeric value is set', () => {
    const field = fieldSettings;
    const { input, onChangeSpy } = setup({ field, defaultValue: 20 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid' } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith('');
  });

  it('should parse float numbers as integers', () => {
    const field = fieldSettings;
    const testValue = (Math.random() * (20 - -20 + 1) + -20).toFixed(2);
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(parseInt(testValue, 10));
  });

  it('should parse float numbers as float', () => {
    const field = { ...fieldSettings, value_type: 'float' };
    const testValue = (Math.random() * (20 - -20 + 1) + -20).toFixed(2);
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(parseFloat(testValue));
  });

  it('should allow 0 as a value', () => {
    const field = fieldSettings;
    const testValue = 0;
    const { input } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(input.value).toBe('0');
  });

  it('unset value_type should produce a number result for whole numbers', () => {
    const field = {};
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '42' } });

    expect(onChangeSpy).toHaveBeenCalledWith(42);
    expect(typeof onChangeSpy.mock.calls[0][0]).toBe('number');
  });

  it('unset value_type with decimal input should preserve the decimal (DCMS-478)', () => {
    const field = {};
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '9.99' } });

    expect(onChangeSpy).toHaveBeenCalledWith(9.99);
    expect(onChangeSpy.mock.calls[0][0]).toBeCloseTo(9.99);
  });

  it('unset value_type renders step="any" so decimals are accepted', () => {
    const field = {};
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('any');
  });

  describe('unsafe integer precision guard (DCMS-423, ported from DCMS-249/298)', () => {
    const UNSAFE_INT = '99999999999999999999'; // 20 nines, > Number.MAX_SAFE_INTEGER

    it('does NOT pass a corrupted (rounded) number to onChange when value exceeds MAX_SAFE_INTEGER', () => {
      const field = { value_type: 'int' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      expect(onChangeSpy).not.toHaveBeenCalledWith(100000000000000000000);
      expect(onChangeSpy).not.toHaveBeenCalledWith(parseInt(UNSAFE_INT, 10));
    });

    it('passes the raw string to onChange when value exceeds MAX_SAFE_INTEGER', () => {
      const field = { value_type: 'int' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      expect(onChangeSpy).toHaveBeenCalledWith(UNSAFE_INT);
    });

    it('isValid returns a CUSTOM error when the stored value is an unsafe integer string', () => {
      const field = { value_type: 'int' };
      const { ref } = setup({ field, defaultValue: UNSAFE_INT });

      const result = ref().isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('CUSTOM');
      expect(result.error.message).toMatch(/maximum safe integer/i);
    });

    it('isValid returns a CUSTOM error for MAX_SAFE_INTEGER + 1', () => {
      const field = { value_type: 'int' };
      const unsafeValue = String(Number.MAX_SAFE_INTEGER + 1);
      const { ref } = setup({ field, defaultValue: unsafeValue });

      const result = ref().isValid();
      expect(result).not.toBe(true);
      expect(result.error.type).toBe('CUSTOM');
    });

    it('isValid returns a CUSTOM error for MIN_SAFE_INTEGER - 1', () => {
      const field = { value_type: 'int' };
      const unsafeValue = String(Number.MIN_SAFE_INTEGER - 1);
      const { ref } = setup({ field, defaultValue: unsafeValue });

      const result = ref().isValid();
      expect(result).not.toBe(true);
      expect(result.error.type).toBe('CUSTOM');
    });

    it('float fields are NOT affected by the unsafe integer guard', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '1e20' } });

      expect(onChangeSpy).toHaveBeenCalledWith(1e20);
    });

    it('safe integers are unaffected, including MAX_SAFE_INTEGER boundary', () => {
      const field = { value_type: 'int' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: String(Number.MAX_SAFE_INTEGER) } });

      expect(onChangeSpy).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
    });

    it('safe integers pass isValid with no error', () => {
      const field = { value_type: 'int' };
      const { ref } = setup({ field, defaultValue: Number.MAX_SAFE_INTEGER });

      expect(ref().isValid()).toBe(true);
    });

    it('unset value_type (defaults to float path, DCMS-478) is not subject to the int guard', () => {
      const field = {};
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      // Unset value_type now parses like float (matching the step="any" input
      // it renders), so large-but-finite magnitudes pass through like the
      // float case does, rather than being guarded as an unsafe integer.
      expect(onChangeSpy).toHaveBeenCalledWith(parseFloat(UNSAFE_INT));
    });
  });

  describe('float non-finite overflow guard (DCMS-423, ported from DCMS-249/298)', () => {
    const OVERFLOW = '1e309'; // parses to Infinity via parseFloat

    // jsdom's <input type="number"> value sanitization is stricter than real
    // browsers: it silently discards magnitude-overflowing (but syntactically
    // valid) strings like "1e309" at DOM-assignment time, before a change
    // event can ever reach our handler with that raw value. Flip the input to
    // type="text" first (parsing behavior is identical; only the DOM's value
    // sanitizer differs) to reproduce what a real browser's change event
    // delivers, mirroring the workaround used for this on `main`.
    function fireOverflowChange(input, value) {
      input.setAttribute('type', 'text');
      fireEvent.change(input, { target: { value } });
    }

    it('does NOT pass Infinity to onChange when value overflows the float range', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireOverflowChange(input, OVERFLOW);

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).not.toHaveBeenCalledWith(Infinity);
    });

    it('passes the raw string to onChange when value overflows the float range', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireOverflowChange(input, OVERFLOW);

      expect(onChangeSpy).toHaveBeenCalledWith(OVERFLOW);
    });

    it('also guards -Infinity overflow', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireOverflowChange(input, '-1e309');

      expect(onChangeSpy).not.toHaveBeenCalledWith(-Infinity);
      expect(onChangeSpy).toHaveBeenCalledWith('-1e309');
    });

    it('isValid returns a CUSTOM error when the stored value is a non-finite float string', () => {
      const field = { value_type: 'float' };
      const { ref } = setup({ field, defaultValue: OVERFLOW });

      const result = ref().isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('CUSTOM');
      expect(result.error.message).toMatch(/maximum representable number/i);
    });

    it('representable large floats are unaffected', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '1e300' } });

      expect(onChangeSpy).toHaveBeenCalledWith(1e300);
    });

    it('normal float input still works', () => {
      const field = { value_type: 'float' };
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '3.14' } });

      expect(onChangeSpy).toHaveBeenCalledWith(3.14);
    });
  });

  describe('validateMinMax', () => {
    const field = { label: 'label' };
    const t = vi.fn((_, params) => params);

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return error when min max are defined and value is out of range', () => {
      const error = validateMinMax(5, 0, 1, field, t);
      const expectedMessage = {
        fieldLabel: 'label',
        minValue: 0,
        maxValue: 1,
      };
      expect(error).not.toBeNull();
      expect(error).toEqual({
        type: 'RANGE',
        message: expectedMessage,
      });
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('editor.editorControlPane.widget.range', expectedMessage);
    });

    it('should return error when min is defined and value is out of range', () => {
      const error = validateMinMax(5, 6, false, field, t);
      const expectedMessage = {
        fieldLabel: 'label',
        minValue: 6,
      };
      expect(error).not.toBeNull();
      expect(error).toEqual({
        type: 'RANGE',
        message: expectedMessage,
      });
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('editor.editorControlPane.widget.min', expectedMessage);
    });

    it('should return error when max is defined and value is out of range', () => {
      const error = validateMinMax(5, false, 3, field, t);
      const expectedMessage = {
        fieldLabel: 'label',
        maxValue: 3,
      };
      expect(error).not.toBeNull();
      expect(error).toEqual({
        type: 'RANGE',
        message: expectedMessage,
      });
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('editor.editorControlPane.widget.max', expectedMessage);
    });

    it('should not return error when min max are defined and value is empty', () => {
      const error = validateMinMax('', 0, 1, field, t);

      expect(error).toBeNull();
    });

    it('should not return error when min max are defined and value is in range', () => {
      const error = validateMinMax(0, -1, 1, field, t);

      expect(error).toBeNull();
    });
  });
});

// DCMS-1083: failed-save validation rendered a visible `ControlErrorsList`
// with no programmatic error state on the underlying input, so
// screen-reader users could not identify which field was invalid.
describe('NumberControl aria validation wiring (DCMS-1083)', () => {
  const baseProps = {
    field: fieldSettings,
    onChange: vi.fn(),
    forID: 'test-number',
    classNameWrapper: '',
    setActiveStyle: vi.fn(),
    setInactiveStyle: vi.fn(),
    t: (key: string) => key,
  };

  it('marks a required field as aria-required by default', () => {
    const { container } = render(<NumberControl {...baseProps} value="" />);
    expect(container.querySelector('input')).toHaveAttribute('aria-required', 'true');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { container } = render(<NumberControl {...baseProps} value="" />);
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { container } = render(
      <NumberControl {...baseProps} value="" hasErrors errorListId="count-field-1-errors" />,
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage', 'count-field-1-errors');
  });
});
