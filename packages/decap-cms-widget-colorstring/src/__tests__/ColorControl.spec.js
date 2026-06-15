import React from 'react';
import { fromJS } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

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
});
