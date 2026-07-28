import React from 'react';
import { fromJS } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

import { normalizeConfig } from '../../../decap-cms-core/src/actions/config';
import { DecapCmsWidgetNumber } from '../';
import { validateMinMax } from '../NumberControl';
import schema from '../schema';

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

  handleOnChange = jest.fn(value => {
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
  const stateChangeSpy = jest.fn();
  const setActiveSpy = jest.fn();
  const setInactiveSpy = jest.fn();

  const helpers = render(
    <NumberController defaultValue={defaultValue} onStateChange={stateChangeSpy}>
      {({ value, handleOnChange }) => {
        renderArgs = { value, onChangeSpy: handleOnChange };
        return (
          <NumberControl
            field={field}
            value={value}
            onChange={handleOnChange}
            forID="test-number"
            classNameWrapper=""
            setActiveStyle={setActiveSpy}
            setInactiveStyle={setInactiveSpy}
            t={jest.fn()}
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
  };
}

describe('Number widget schema', () => {
  it('should restrict value_type to int and float enum values', () => {
    expect(schema.properties.value_type).toEqual({ type: 'string', enum: ['int', 'float'] });
  });

  it('should accept step: any as a valid schema value', () => {
    expect(schema.properties.step).toEqual({
      oneOf: [{ type: 'number' }, { type: 'string', enum: ['any'] }],
    });
  });

  it('should accept slider as a boolean schema value', () => {
    expect(schema.properties.slider).toEqual({ type: 'boolean' });
  });

  it('unset value_type should produce a number result for whole numbers', () => {
    const field = fromJS({});
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '42' } });

    expect(onChangeSpy).toHaveBeenCalledWith(42);
    expect(typeof onChangeSpy.mock.calls[0][0]).toBe('number');
  });

  it('unset value_type with decimal input should preserve the decimal (DCMS-478)', () => {
    const field = fromJS({});
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '9.99' } });

    expect(onChangeSpy).toHaveBeenCalledWith(9.99);
    expect(onChangeSpy.mock.calls[0][0]).toBeCloseTo(9.99);
  });

  it('pins README contract: omitted value_type parses via parseFloat, not parseInt (DCMS-484)', () => {
    // README.md documents that an omitted `value_type` is parsed via the
    // same `parseFloat` path as `value_type: 'float'` (not `parseInt`).
    // This test exists solely to catch future drift between that doc claim
    // and handleChange()'s actual behavior — if this breaks, either the
    // code regressed to parseInt for the omitted case or the README needs
    // to be re-updated to match a new intentional behavior change.
    const field = fromJS({});
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '9.99' } });

    expect(onChangeSpy).toHaveBeenCalledWith(9.99);
    expect(onChangeSpy).not.toHaveBeenCalledWith(parseInt('9.99', 10));
  });

  it('value_type int should produce integer result', () => {
    const field = fromJS({ value_type: 'int' });
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '3.7' } });

    expect(onChangeSpy).toHaveBeenCalledWith(3);
    expect(Number.isInteger(onChangeSpy.mock.calls[0][0])).toBe(true);
  });

  it('value_type float should produce float result', () => {
    const field = fromJS({ value_type: 'float' });
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '3.7' } });

    expect(onChangeSpy).toHaveBeenCalledWith(3.7);
    expect(onChangeSpy.mock.calls[0][0]).toBeCloseTo(3.7);
  });
});

describe('deprecated camelCase valueType alias (DCMS-1485)', () => {
  // README.md documents `valueType` (camelCase) as a deprecated-but-functional
  // alias for `value_type`, auto-migrated by decap-cms-core's normalizeConfig
  // at config-load time. This pins the end-to-end doc claim by running a real
  // config through normalizeConfig (not hand-authoring value_type directly)
  // and asserting NumberControl's int parsing path is actually engaged.
  function normalizedNumberField(fieldConfig) {
    const config = normalizeConfig({
      collections: [
        {
          folder: 'src',
          fields: [{ name: 'count', ...fieldConfig }],
        },
      ],
    });
    return fromJS(config.collections[0].fields[0]);
  }

  it('normalizes camelCase valueType onto snake_case value_type', () => {
    const field = normalizedNumberField({ widget: 'number', valueType: 'int' });

    expect(field.get('value_type')).toBe('int');
  });

  it('renders step="1" for a field normalized from valueType: int', () => {
    const field = normalizedNumberField({ widget: 'number', valueType: 'int' });
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('1');
  });

  it('parses input as an integer for a field normalized from valueType: int', () => {
    const field = normalizedNumberField({ widget: 'number', valueType: 'int' });
    const { input, onChangeSpy } = setup({ field });

    fireEvent.change(input, { target: { value: '3.7' } });

    expect(onChangeSpy).toHaveBeenCalledWith(3);
    expect(Number.isInteger(onChangeSpy.mock.calls[0][0])).toBe(true);
  });
});

describe('Number widget', () => {
  it('should call onChange when input changes', () => {
    const field = fromJS(fieldSettings);
    const testValue = Math.floor(Math.random() * (20 - -20 + 1)) + -20;
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(testValue);
  });

  it('should call onChange with empty string when no value is set', () => {
    const field = fromJS(fieldSettings);
    const { input, onChangeSpy } = setup({ field, defaultValue: 20 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith('');
  });

  it('should call onChange with empty string when a non numeric value is set', () => {
    const field = fromJS(fieldSettings);
    const { input, onChangeSpy } = setup({ field, defaultValue: 20 });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid' } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith('');
  });

  it('should parse float numbers as integers', () => {
    const field = fromJS(fieldSettings);
    const testValue = (Math.random() * (20 - -20 + 1) + -20).toFixed(2);
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(parseInt(testValue, 10));
  });

  it('should parse float numbers as float', () => {
    const field = fromJS({ ...fieldSettings, value_type: 'float' });
    const testValue = (Math.random() * (20 - -20 + 1) + -20).toFixed(2);
    const { input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(parseFloat(testValue));
  });

  it('float field with no explicit step renders with step="any"', () => {
    const field = fromJS({ value_type: 'float' });
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('any');
  });

  it('int field with no explicit step renders with step="1"', () => {
    const field = fromJS({ value_type: 'int' });
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('1');
  });

  it('field with no value_type and no explicit step renders with step="any" (DCMS-378)', () => {
    const field = fromJS({});
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('any');
  });

  it('field with an unrecognized value_type and no explicit step renders with step="any" (DCMS-378)', () => {
    const field = fromJS({ value_type: 'not-a-real-type' });
    const { input } = setup({ field });

    expect(input.getAttribute('step')).toBe('any');
  });

  it('explicit step overrides the value_type-derived default for every value_type (DCMS-378)', () => {
    ['int', 'float', undefined].forEach(value_type => {
      const field = fromJS(value_type === undefined ? { step: 0.5 } : { value_type, step: 0.5 });
      const { input, unmount } = setup({ field });

      expect(input.getAttribute('step')).toBe('0.5');
      unmount();
    });
  });

  it('numeric default renders as a number value in the input (DCMS-240)', () => {
    const field = fromJS({ value_type: 'int' });
    const numericDefault = 42;
    const { input } = setup({ field, defaultValue: numericDefault });

    expect(typeof numericDefault).toBe('number');
    expect(input.value).toBe('42');
  });

  it('should allow 0 as a value', () => {
    const field = fromJS(fieldSettings);
    const testValue = 0;
    const { input } = setup({ field });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: String(testValue) } });

    expect(input.value).toBe('0');
  });

  describe('unsafe integer precision guard (DCMS-249)', () => {
    const UNSAFE_INT = '99999999999999999999'; // 20 nines, > Number.MAX_SAFE_INTEGER

    it('does NOT pass a corrupted (rounded) number to onChange when value exceeds MAX_SAFE_INTEGER', () => {
      const field = fromJS({ value_type: 'int' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      // The corrupted rounded value must never reach onChange
      expect(onChangeSpy).not.toHaveBeenCalledWith(100000000000000000000);
      expect(onChangeSpy).not.toHaveBeenCalledWith(parseInt(UNSAFE_INT, 10));
    });

    it('passes the raw string to onChange when value exceeds MAX_SAFE_INTEGER', () => {
      const field = fromJS({ value_type: 'int' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      expect(onChangeSpy).toHaveBeenCalledWith(UNSAFE_INT);
    });

    it('isValid returns a CUSTOM error when the stored value is an unsafe integer string', () => {
      const field = fromJS({ value_type: 'int' });
      const instance = new NumberControl({
        field,
        value: UNSAFE_INT,
        t: jest.fn(key => key),
        onChange: jest.fn(),
        classNameWrapper: '',
        setActiveStyle: jest.fn(),
        setInactiveStyle: jest.fn(),
      });

      const result = instance.isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('CUSTOM');
      expect(result.error.message).toMatch(/maximum safe integer/i);
    });

    it('float fields are NOT affected by the unsafe integer guard', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      // A large but representable float — should pass through unchanged
      fireEvent.change(input, { target: { value: '1e20' } });

      expect(onChangeSpy).toHaveBeenCalledWith(1e20);
    });

    it('safe integers are unaffected', () => {
      const field = fromJS({ value_type: 'int' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: String(Number.MAX_SAFE_INTEGER) } });

      expect(onChangeSpy).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
    });

    it('unset value_type (defaults to float path, DCMS-478) still guards unsafe-integer-looking input (DCMS-505)', () => {
      const field = fromJS({});
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      // Unset value_type parses via parseFloat (matching the step="any" input
      // it renders), but an integer-looking string that parseFloat would
      // silently round must be guarded the same way the int path guards it.
      expect(onChangeSpy).not.toHaveBeenCalledWith(parseFloat(UNSAFE_INT));
      expect(onChangeSpy).toHaveBeenCalledWith(UNSAFE_INT);
    });
  });

  describe('unsafe integer precision guard on float/unset value_type (DCMS-505)', () => {
    // 26 nines: parses via parseFloat to 1e+26, silently losing precision,
    // matching the example from the reported issue.
    const UNSAFE_INT_26_DIGITS = '9'.repeat(26);

    it('does NOT pass a corrupted (rounded) number to onChange for a 26-digit integer typed into a float field', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT_26_DIGITS } });

      expect(onChangeSpy).not.toHaveBeenCalledWith(parseFloat(UNSAFE_INT_26_DIGITS));
    });

    it('passes the raw string to onChange for a 26-digit integer typed into a float field', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT_26_DIGITS } });

      expect(onChangeSpy).toHaveBeenCalledWith(UNSAFE_INT_26_DIGITS);
    });

    it('isValid returns a CUSTOM error when the stored value is an unsafe integer string on a float field', () => {
      const field = fromJS({ value_type: 'float' });
      const instance = new NumberControl({
        field,
        value: UNSAFE_INT_26_DIGITS,
        t: jest.fn(key => key),
        onChange: jest.fn(),
        classNameWrapper: '',
        setActiveStyle: jest.fn(),
        setInactiveStyle: jest.fn(),
      });

      const result = instance.isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('CUSTOM');
      expect(result.error.message).toMatch(/maximum safe integer/i);
    });

    it('decimal input on a float field is unaffected by the unsafe-integer guard', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '3.14' } });

      expect(onChangeSpy).toHaveBeenCalledWith(3.14);
    });
  });

  describe('float infinity overflow guard (DCMS-408)', () => {
    const OVERFLOW = '1e309'; // parses to Infinity via parseFloat

    // jsdom's <input type="number"> value sanitization is stricter than real
    // browsers: it rejects magnitude-overflowing (but syntactically valid)
    // strings like "1e309" at DOM-assignment time, before a change event can
    // ever reach our handler with that raw value. So we call handleChange
    // directly (as isValid() is tested below) to reproduce what a real
    // browser's change event delivers.
    function makeInstance(onChange) {
      const field = fromJS({ value_type: 'float' });
      return new NumberControl({
        field,
        value: '',
        t: jest.fn(key => key),
        onChange,
        classNameWrapper: '',
        setActiveStyle: jest.fn(),
        setInactiveStyle: jest.fn(),
      });
    }

    it('does NOT pass Infinity to onChange when value overflows the float range', () => {
      const onChange = jest.fn();
      const instance = makeInstance(onChange);

      instance.handleChange({ target: { value: OVERFLOW } });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalledWith(Infinity);
    });

    it('passes the raw string to onChange when value overflows the float range', () => {
      const onChange = jest.fn();
      const instance = makeInstance(onChange);

      instance.handleChange({ target: { value: OVERFLOW } });

      expect(onChange).toHaveBeenCalledWith(OVERFLOW);
    });

    it('also guards -Infinity overflow', () => {
      const onChange = jest.fn();
      const instance = makeInstance(onChange);

      instance.handleChange({ target: { value: '-1e309' } });

      expect(onChange).not.toHaveBeenCalledWith(-Infinity);
      expect(onChange).toHaveBeenCalledWith('-1e309');
    });

    it('isValid returns a CUSTOM error when the stored value is a non-finite float string', () => {
      const field = fromJS({ value_type: 'float' });
      const instance = new NumberControl({
        field,
        value: OVERFLOW,
        t: jest.fn(key => key),
        onChange: jest.fn(),
        classNameWrapper: '',
        setActiveStyle: jest.fn(),
        setInactiveStyle: jest.fn(),
      });

      const result = instance.isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('CUSTOM');
      expect(result.error.message).toMatch(/maximum representable number/i);
    });

    it('representable large floats are unaffected', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '1e300' } });

      expect(onChangeSpy).toHaveBeenCalledWith(1e300);
    });

    it('normal float input still works', () => {
      const field = fromJS({ value_type: 'float' });
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: '3.14' } });

      expect(onChangeSpy).toHaveBeenCalledWith(3.14);
    });
  });

  describe('isValid with pattern and min/max (DCMS-104)', () => {
    const tFn = jest.fn(key => key);

    function makeControl(fieldObj, value) {
      const field = fromJS(fieldObj);
      const instance = new NumberControl({
        field,
        value,
        t: tFn,
        onChange: jest.fn(),
        classNameWrapper: '',
        setActiveStyle: jest.fn(),
        setInactiveStyle: jest.fn(),
      });
      return instance;
    }

    it('returns error when pattern is set and value is below min', () => {
      const ctrl = makeControl({ pattern: ['^\\d+$', 'digits only'], min: 1, max: 10 }, 0);
      const result = ctrl.isValid();
      expect(result).not.toBe(true);
      expect(result).toHaveProperty('error');
      expect(result.error.type).toBe('RANGE');
    });

    it('returns true when pattern is set and value is within min/max', () => {
      const ctrl = makeControl({ pattern: ['^\\d+$', 'digits only'], min: 1, max: 10 }, 5);
      expect(ctrl.isValid()).toBe(true);
    });

    it('returns true when pattern is set and no min/max configured', () => {
      const ctrl = makeControl({ pattern: ['^\\d+$', 'digits only'] }, 999);
      expect(ctrl.isValid()).toBe(true);
    });
  });

  describe('validateMinMax', () => {
    const field = { get: jest.fn() };
    field.get.mockReturnValue('label');
    const t = jest.fn();
    t.mockImplementation((_, params) => params);

    beforeEach(() => {
      jest.clearAllMocks();
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

describe('Number widget slider option (DCMS-1424)', () => {
  it('renders a single plain number input when slider is unset (default, unchanged behavior)', () => {
    const field = fromJS(fieldSettings);
    const { container } = setup({ field });

    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute('type')).toBe('number');
  });

  it('renders a single plain number input when slider is explicitly false', () => {
    const field = fromJS({ ...fieldSettings, slider: false });
    const { container } = setup({ field });

    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute('type')).toBe('number');
  });

  it('renders a paired range + number input when slider is true', () => {
    const field = fromJS({ ...fieldSettings, slider: true });
    const { container } = setup({ field });

    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].getAttribute('type')).toBe('range');
    expect(inputs[1].getAttribute('type')).toBe('number');
  });

  it('slider range input carries the field min/max/step', () => {
    const field = fromJS({ ...fieldSettings, slider: true });
    const { container } = setup({ field });

    const range = container.querySelector('input[type="range"]');
    expect(range.getAttribute('min')).toBe('-20');
    expect(range.getAttribute('max')).toBe('20');
    expect(range.getAttribute('step')).toBe('1');
  });

  it('dragging the range input calls onChange like the plain input', () => {
    const field = fromJS({ ...fieldSettings, slider: true });
    const { container, onChangeSpy } = setup({ field });

    const range = container.querySelector('input[type="range"]');
    fireEvent.change(range, { target: { value: '5' } });

    expect(onChangeSpy).toHaveBeenCalledWith(5);
  });

  it('editing the paired number input calls onChange like the plain input', () => {
    const field = fromJS({ ...fieldSettings, slider: true });
    const { container, onChangeSpy } = setup({ field });

    const number = container.querySelector('input[type="number"]');
    fireEvent.change(number, { target: { value: '-7' } });

    expect(onChangeSpy).toHaveBeenCalledWith(-7);
  });

  it('range input falls back to min (not empty string) when value is unset, avoiding an uncontrolled-input warning', () => {
    const field = fromJS({ min: -10, max: 10, slider: true });
    const { container } = setup({ field });

    const range = container.querySelector('input[type="range"]');
    expect(range.value).toBe('-10');
  });

  it('range input falls back to 0 when both value and min are unset', () => {
    const field = fromJS({ slider: true });
    const { container } = setup({ field });

    const range = container.querySelector('input[type="range"]');
    expect(range.value).toBe('0');
  });

  it('both inputs reflect a numeric default value', () => {
    const field = fromJS({ ...fieldSettings, slider: true });
    const { container } = setup({ field, defaultValue: 12 });

    const range = container.querySelector('input[type="range"]');
    const number = container.querySelector('input[type="number"]');
    expect(range.value).toBe('12');
    expect(number.value).toBe('12');
  });
});
