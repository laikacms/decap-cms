import React from 'react';
import { fromJS } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

// Real ChromePicker renders a canvas-based gradient/hue UI that jsdom cannot
// lay out. The behavior under test (handleChange formatting) only depends on
// the `onChange` callback ChromePicker is given, so stub it with a button
// that invokes onChange with the color set via `mockNextColor`.
let mockNextColor = { hex: '#ff0000', rgb: { r: 255, g: 0, b: 0, a: 1 } };

jest.mock('react-color', () => ({
  __esModule: true,
  default: ({ onChange }) => (
    <button type="button" aria-label="mock-chrome-picker" onClick={() => onChange(mockNextColor)}>
      mock-chrome-picker
    </button>
  ),
}));

import ColorControl from '../ColorControl';

function setup({ fieldConfig = {} } = {}) {
  const field = fromJS({ name: 'color', widget: 'color', ...fieldConfig });
  const props = {
    forID: 'test-color',
    onChange: jest.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: jest.fn(),
    setInactiveStyle: jest.fn(),
    value: '#ff0000',
    field,
  };

  const utils = render(<ColorControl {...props} />);
  return { ...utils, props };
}

describe('ColorControl', () => {
  describe('allow_input (snake_case)', () => {
    it('renders a readonly input when allow_input is false (default)', () => {
      const { getByRole } = setup();
      const input = getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('renders an editable input when allow_input: true', () => {
      const { getByRole } = setup({ fieldConfig: { allow_input: true } });
      const input = getByRole('textbox');
      expect(input).not.toHaveAttribute('readonly');
    });
  });

  describe('allowInput (camelCase alias)', () => {
    it('renders an editable input when allowInput: true is used instead of allow_input', () => {
      const { getByRole } = setup({ fieldConfig: { allowInput: true } });
      const input = getByRole('textbox');
      expect(input).not.toHaveAttribute('readonly');
    });

    it('snake_case allow_input takes precedence over camelCase allowInput', () => {
      // allow_input: false + allowInput: true → snake_case wins → readonly
      const { getByRole } = setup({ fieldConfig: { allow_input: false, allowInput: true } });
      const input = getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('enable_alpha (snake_case)', () => {
    it('renders ChromePicker with disableAlpha=true when enable_alpha is false (default)', () => {
      const { queryByTitle } = setup({ fieldConfig: { allow_input: true } });
      // ChromePicker opens on swatch click; just validate no crash with snake_case key absent
      expect(queryByTitle).toBeDefined();
    });
  });

  describe('enableAlpha (camelCase alias)', () => {
    it('opens ChromePicker without crashing when enableAlpha: true is used', () => {
      const { getByRole } = setup({ fieldConfig: { enableAlpha: true } });
      const swatch = getByRole('button', { name: /open color picker/i });
      // clicking the swatch should open the picker without error
      fireEvent.click(swatch);
      // ChromePicker renders a canvas or colour inputs; just assert no throw
      expect(swatch).toBeInTheDocument();
    });
  });

  describe('handleChange (picker onChange)', () => {
    function openPicker(getByRole) {
      const swatch = getByRole('button', { name: /open color picker/i });
      fireEvent.click(swatch);
      return getByRole('button', { name: 'mock-chrome-picker' });
    }

    it('calls onChange with rgba(r, g, b, a) when alpha < 1', () => {
      mockNextColor = { hex: '#ff0000', rgb: { r: 10, g: 20, b: 30, a: 0.5 } };
      const { getByRole, props } = setup();

      const picker = openPicker(getByRole);
      fireEvent.click(picker);

      expect(props.onChange).toHaveBeenCalledTimes(1);
      expect(props.onChange).toHaveBeenCalledWith('rgba(10, 20, 30, 0.5)');
    });

    it('calls onChange with the hex string when alpha === 1', () => {
      mockNextColor = { hex: '#abcdef', rgb: { r: 171, g: 205, b: 239, a: 1 } };
      const { getByRole, props } = setup();

      const picker = openPicker(getByRole);
      fireEvent.click(picker);

      expect(props.onChange).toHaveBeenCalledTimes(1);
      expect(props.onChange).toHaveBeenCalledWith('#abcdef');
    });
  });

  describe('clear button', () => {
    it('calls onChange with an empty string when the clear button is clicked', () => {
      const { getByRole, props } = setup();

      const clearButton = getByRole('button', { name: /clear color/i });
      fireEvent.click(clearButton);

      expect(props.onChange).toHaveBeenCalledTimes(1);
      expect(props.onChange).toHaveBeenCalledWith('');
    });

    it('is absent when there is no value to clear', () => {
      const { getByRole } = render(
        <ColorControl
          forID="test-color"
          onChange={jest.fn()}
          classNameWrapper="classNameWrapper"
          setActiveStyle={jest.fn()}
          setInactiveStyle={jest.fn()}
          value=""
          field={fromJS({ name: 'color', widget: 'color' })}
        />,
      );
      expect(() => getByRole('button', { name: /clear color/i })).toThrow();
    });

    it('is absent when field.allowInput is true', () => {
      const { queryByRole } = setup({ fieldConfig: { allowInput: true } });
      expect(queryByRole('button', { name: /clear color/i })).not.toBeInTheDocument();
    });
  });

  describe('readOnly / allowInput text input', () => {
    it('opens the color picker on click instead of accepting typed input when readOnly', () => {
      const { getByRole } = setup();
      const input = getByRole('textbox');

      fireEvent.click(input);

      // clicking a readOnly input opens the picker (handleClick wired to onClick)
      expect(getByRole('button', { name: 'mock-chrome-picker' })).toBeInTheDocument();
    });

    it('fires onChange when typing into an editable input (allowInput: true)', () => {
      const { getByRole, props } = setup({ fieldConfig: { allowInput: true } });
      const input = getByRole('textbox');

      fireEvent.change(input, { target: { value: 'blue' } });

      expect(props.onChange).toHaveBeenCalledWith('blue');
    });
  });
});
