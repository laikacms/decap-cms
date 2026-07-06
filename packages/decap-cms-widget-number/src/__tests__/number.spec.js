import React from 'react';
import { fromJS } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

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

  it('unset value_type should produce integer result (parseInt fallback)', () => {
    const field = fromJS({});
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '42' } });

    expect(onChangeSpy).toHaveBeenCalledWith(42);
    expect(Number.isInteger(onChangeSpy.mock.calls[0][0])).toBe(true);
    expect(typeof onChangeSpy.mock.calls[0][0]).toBe('number');
  });

  it('unset value_type with decimal input should truncate to integer', () => {
    const field = fromJS({});
    const { onChangeSpy, input } = setup({ field });

    fireEvent.change(input, { target: { value: '3.9' } });

    expect(onChangeSpy).toHaveBeenCalledWith(3);
    expect(Number.isInteger(onChangeSpy.mock.calls[0][0])).toBe(true);
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

    it('unset value_type (defaults to int path) also guards unsafe integers', () => {
      const field = fromJS({});
      const { input, onChangeSpy } = setup({ field });

      fireEvent.change(input, { target: { value: UNSAFE_INT } });

      expect(onChangeSpy).not.toHaveBeenCalledWith(parseInt(UNSAFE_INT, 10));
      expect(onChangeSpy).toHaveBeenCalledWith(UNSAFE_INT);
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
