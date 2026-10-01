import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DecapCmsWidgetSelect } from '@/widgets/select';

const SelectControl = DecapCmsWidgetSelect.controlComponent;

const options = [
  { value: 'foo', label: 'Foo' },
  { value: 'bar', label: 'Bar' },
  { value: 'baz', label: 'Baz' },
];
const stringOptions = ['foo', 'bar', 'baz'];
const numberOptions = [
  { value: 0, label: 'Foo' },
  { value: 1, label: 'Bar' },
  { value: 2, label: 'Baz' },
];

class SelectController extends React.Component {
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

function setup({ field, defaultValue, hasErrors, errorListId }) {
  let renderArgs, ref;
  const stateChangeSpy = vi.fn();
  const setActiveSpy = vi.fn();
  const setInactiveSpy = vi.fn();

  const helpers = render(
    <SelectController defaultValue={defaultValue} onStateChange={stateChangeSpy}>
      {({ value, handleOnChange }) => {
        renderArgs = { value, onChangeSpy: handleOnChange };
        return (
          <SelectControl
            field={field}
            value={value}
            onChange={handleOnChange}
            forID="basic-select"
            classNameWrapper=""
            setActiveStyle={setActiveSpy}
            setInactiveStyle={setInactiveSpy}
            ref={widgetRef => (ref = widgetRef)}
            t={msg => msg}
            hasErrors={hasErrors}
            errorListId={errorListId}
          />
        );
      }}
    </SelectController>,
  );

  const input = helpers.container.querySelector('input');

  return {
    ...helpers,
    ...renderArgs,
    stateChangeSpy,
    setActiveSpy,
    setInactiveSpy,
    ref,
    input,
  };
}

function clickClearButton(container) {
  const clear = container.querySelector('[data-slot="combobox-clear"]');
  fireEvent.click(clear);
}

describe('Select widget', () => {
  it('should call onChange with correct selectedItem', () => {
    const field = { options };
    const { getByText, input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.click(getByText('Foo'));

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(options[0].value);
  });

  it('should call onChange with null when no item is selected', () => {
    const field = { options, required: false };
    const { input, onChangeSpy } = setup({ field, defaultValue: options[0].value });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(null);
  });

  it('should call onChange with null when selection is cleared', () => {
    const field = { options, required: false };
    const { onChangeSpy, container } = setup({ field, defaultValue: options[0].value });

    clickClearButton(container);

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(null);
  });

  it('should respect default value', () => {
    const field = { options };
    const { input } = setup({ field, defaultValue: options[2].value });

    expect(input.value).toBe('Baz');
  });

  it('should respect default value when options are string only', () => {
    const field = { options: stringOptions };
    const { input } = setup({
      field,
      defaultValue: stringOptions[2],
    });

    expect(input.value).toBe('baz');
  });

  it('should call onChange with correct selectedItem when value is number 0', () => {
    const field = { options: numberOptions };
    const { getByText, input, onChangeSpy } = setup({ field });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.click(getByText('Foo'));

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith(numberOptions[0].value);
  });

  describe('with bare number options (DCMS-2349)', () => {
    const bareNumbers = [0, 1, 2];

    it('renders labels and calls onChange with the number', () => {
      const { getByText, input, onChangeSpy } = setup({ field: { options: bareNumbers } });

      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(getByText('0')).toBeInTheDocument();
      expect(getByText('1')).toBeInTheDocument();
      expect(getByText('2')).toBeInTheDocument();
      fireEvent.click(getByText('1'));

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith(1);
    });

    it('shows an existing numeric value as selected', () => {
      const { input } = setup({ field: { options: bareNumbers }, defaultValue: 2 });

      expect(input.value).toBe('2');
    });

    it('supports multiple selection', () => {
      const { getByText, input, onChangeSpy } = setup({
        field: { options: bareNumbers, multiple: true },
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('0'));
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('2'));

      expect(onChangeSpy).toHaveBeenCalledWith([0]);
      expect(onChangeSpy).toHaveBeenCalledWith([0, 2]);
    });
  });

  describe('with multiple', () => {
    it('should call onChange with correct selectedItem', () => {
      const field = { options, multiple: true };
      const { getByText, input, onChangeSpy } = setup({ field });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('Foo'));
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('Baz'));

      expect(onChangeSpy).toHaveBeenCalledTimes(2);
      expect(onChangeSpy).toHaveBeenCalledWith([options[0].value]);
      expect(onChangeSpy).toHaveBeenCalledWith([options[0].value, options[2].value]);
    });

    it('should call onChange with correct selectedItem when item is removed', () => {
      const field = { options, multiple: true };
      const { container, onChangeSpy } = setup({
        field,
        defaultValue: [options[1].value, options[2].value],
      });

      fireEvent.click(container.querySelector('svg'), { button: 0 });

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith([options[2].value]);
    });

    it('should call onChange with empty list on mount when required is true', () => {
      const field = { options, multiple: true, required: true };
      const { onChangeSpy } = setup({
        field,
      });
      expect(onChangeSpy).toHaveBeenCalledWith([]);
    });

    it('should not call onChange with empty list on mount when required is false', () => {
      const field = { options, multiple: true };
      const { onChangeSpy } = setup({
        field,
      });
      expect(onChangeSpy).not.toHaveBeenCalled();
    });

    it('should call onChange with null when the last item is removed and required is not set', () => {
      const field = { options, multiple: true };
      const { input, onChangeSpy } = setup({
        field,
        defaultValue: [options[1].value],
      });

      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'Backspace' });

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith(null);
    });

    it('should not throw on Backspace/ArrowLeft in an empty input on a new (unselected) entry (DCMS-1027)', () => {
      const field = { options, multiple: true };
      const { input } = setup({ field });

      fireEvent.focus(input);
      expect(() => {
        fireEvent.keyDown(input, { key: 'Backspace' });
        fireEvent.keyDown(input, { key: 'ArrowLeft' });
      }).not.toThrow();
    });

    it('should call onChange with value in list on mount when value is not a list and required is true', () => {
      const field = { options, multiple: true, required: true };
      const { onChangeSpy } = setup({
        field,
        defaultValue: options[1].value,
      });
      expect(onChangeSpy).toHaveBeenCalledWith([options[1].value]);
    });

    it('should wrap a scalar 0 option value in a list on mount when required and multiple', () => {
      const field = { options: [0, 1, 2], multiple: true, required: true };
      const { onChangeSpy } = setup({ field, defaultValue: 0 });
      expect(onChangeSpy).toHaveBeenCalledWith([0]);
    });

    it('should call onChange with empty list on mount when value is unset, required and multiple', () => {
      const field = { options: [0, 1, 2], multiple: true, required: true };
      const { onChangeSpy } = setup({ field, defaultValue: undefined });
      expect(onChangeSpy).toHaveBeenCalledWith([]);
    });

    it('should call onChange with empty list when selection is cleared and required is true', () => {
      const field = { options, multiple: true, required: true };
      const { container, onChangeSpy } = setup({
        field,
        defaultValue: [options[1].value],
      });

      clickClearButton(container);

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith([]);
    });

    it('should call onChange with null when selection is cleared and required is false', () => {
      const field = { options, multiple: true, required: false };
      const { container, onChangeSpy } = setup({
        field,
        defaultValue: [options[1].value],
      });

      clickClearButton(container);

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith(null);
    });

    it('should respect default value', () => {
      const field = { options, multiple: true };
      const { getByText } = setup({
        field,
        defaultValue: [options[1].value, options[2].value],
      });

      expect(getByText('Bar')).toBeInTheDocument();
      expect(getByText('Baz')).toBeInTheDocument();
    });

    it('should respect default value when options are string only', () => {
      const field = { options: stringOptions, multiple: true };
      const { getByText } = setup({
        field,
        defaultValue: [stringOptions[1], stringOptions[2]],
      });

      expect(getByText('bar')).toBeInTheDocument();
      expect(getByText('baz')).toBeInTheDocument();
    });

    it('should call onChange with correct selectedItem when values are numbers including 0', () => {
      const field = { options: numberOptions, multiple: true };
      const { getByText, input, onChangeSpy } = setup({ field });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('Foo'));
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('Baz'));

      expect(onChangeSpy).toHaveBeenCalledTimes(2);
      expect(onChangeSpy).toHaveBeenCalledWith([numberOptions[0].value]);
      expect(onChangeSpy).toHaveBeenCalledWith([numberOptions[0].value, numberOptions[2].value]);
    });
  });
  describe('validation', () => {
    function validate(setupOpts) {
      const { ref } = setup(setupOpts);
      const { error } = ref.isValid();
      return error?.message;
    }
    it('should fail with less items than min allows', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 2 },
        defaultValue: [stringOptions[0]],
      };
      expect(validate(opts)).toBe('editor.editorControlPane.widget.rangeMin');
    });
    it('should fail with more items than max allows', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, max: 1 },
        defaultValue: [stringOptions[0], stringOptions[1]],
      };
      expect(validate(opts)).toBe('editor.editorControlPane.widget.rangeMax');
    });
    it('should enforce min when both min and max are set', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 2, max: 3 },
        defaultValue: [stringOptions[0]],
      };
      expect(validate(opts)).toBe('editor.editorControlPane.widget.rangeCount');
    });
    it('should enforce max when both min and max are set', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 1, max: 2 },
        defaultValue: [stringOptions[0], stringOptions[1], stringOptions[2]],
      };
      expect(validate(opts)).toBe('editor.editorControlPane.widget.rangeCount');
    });
    it('should enforce min and max when they are the same value', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 2, max: 2 },
        defaultValue: [stringOptions[0], stringOptions[1], stringOptions[2]],
      };
      expect(validate(opts)).toBe('editor.editorControlPane.widget.rangeCountExact');
    });
    it('should pass when min is met', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 1 },
        defaultValue: [stringOptions[0]],
      };
      expect(validate(opts)).toBeUndefined();
    });
    it('should pass when max is met', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, max: 1 },
        defaultValue: [stringOptions[0]],
      };
      expect(validate(opts)).toBeUndefined();
    });
    it('should pass when both min and max are met', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 2, max: 3 },
        defaultValue: [stringOptions[0], stringOptions[1]],
      };
      expect(validate(opts)).toBeUndefined();
    });
    it('should pass when both min and max are met, and are the same value', () => {
      const opts = {
        field: { options: stringOptions, multiple: true, min: 2, max: 2 },
        defaultValue: [stringOptions[0], stringOptions[1]],
      };
      expect(validate(opts)).toBeUndefined();
    });
    it('should not fail on min/max if multiple is not true', () => {
      const opts = {
        field: { options: stringOptions, min: 2, max: 2 },
        defaultValue: [stringOptions[0]],
      };
      expect(validate(opts)).toBeUndefined();
    });
    it('should fail min for an empty multiple field, same as null/undefined/[] (DCMS-2508)', () => {
      const field = { options: stringOptions, multiple: true, min: 1 };
      const messages = [undefined, null, []].map(defaultValue =>
        validate({ field, ...(defaultValue === undefined ? {} : { defaultValue }) }),
      );
      expect(messages).toEqual(Array(3).fill('editor.editorControlPane.widget.rangeMin'));
    });
    it('should not fail for empty field when min is not set', () => {
      const { ref } = setup({ field: { options: stringOptions, multiple: true, max: 2 } });
      expect(ref.isValid().error?.message).toBeUndefined();
    });
    it('should track min as selections are added and cleared', () => {
      const opts = { field: { options: stringOptions, multiple: true, min: 1 } };
      const { ref, input, getByText, container } = setup(opts);
      expect(ref.isValid().error?.message).toBe('editor.editorControlPane.widget.rangeMin');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.click(getByText('foo'));
      expect(ref.isValid().error?.message).toBeUndefined();
      clickClearButton(container);
      expect(ref.isValid().error?.message).toBe('editor.editorControlPane.widget.rangeMin');
    });
  });
});

// DCMS-1083: failed-save validation rendered a visible `ControlErrorsList`
// with no programmatic error state on the underlying input, so
// screen-reader users could not identify which field was invalid.
describe('SelectControl aria validation wiring (DCMS-1083)', () => {
  it('marks a required field as aria-required by default', () => {
    const { input } = setup({ field: { options } });
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { input } = setup({ field: { options } });
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { input } = setup({ field: { options }, hasErrors: true, errorListId: 'select-field-1-errors' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage', 'select-field-1-errors');
  });
});
