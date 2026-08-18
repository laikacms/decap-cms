import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ColorControl from '@/widgets/colorstring/ColorControl';

vi.mock('react-colorful', () => ({
  HexColorPicker: ({ color, onChange }: { color: string, onChange: (color: string) => void }) => (
    <button
      data-testid="hex-picker"
      data-color={color}
      onClick={() => onChange('#123456')}
    />
  ),
  RgbaStringColorPicker: (
    { color, onChange }: { color: string, onChange: (color: string) => void },
  ) => (
    <div data-testid="rgba-picker" data-color={color}>
      <button data-testid="rgba-picker-emit-translucent" onClick={() => onChange('rgba(1, 2, 3, 0.5)')} />
      <button data-testid="rgba-picker-emit-opaque" onClick={() => onChange('rgba(1, 2, 3, 1)')} />
    </div>
  ),
}));

function setup(propsOverrides: Record<string, unknown> = {}) {
  const props = {
    forID: 'test-color',
    onChange: vi.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: vi.fn(),
    setInactiveStyle: vi.fn(),
    value: '',
    field: {},
    t: (key: string) => key,
    ...propsOverrides,
  };

  const utils = render(<ColorControl {...props} />);

  return { ...utils, props };
}

function openPicker(utils: ReturnType<typeof setup>) {
  fireEvent.click(utils.getByRole('button', { name: 'editor.editorWidgets.colorstring.openColorPicker' }));
}

describe('ColorControl', () => {
  describe('handleChange', () => {
    it('passes the raw picker color straight through when enableAlpha is false', () => {
      const utils = setup({ field: { enableAlpha: false } });
      openPicker(utils);

      fireEvent.click(utils.getByTestId('hex-picker'));

      expect(utils.props.onChange).toHaveBeenCalledWith('#123456');
    });

    it('re-parses to an rgb string when enableAlpha is true and alpha < 1', () => {
      const utils = setup({ field: { enableAlpha: true } });
      openPicker(utils);

      fireEvent.click(utils.getByTestId('rgba-picker-emit-translucent'));

      expect(utils.props.onChange).toHaveBeenCalledWith('rgba(1, 2, 3, 0.5)');
    });

    it('re-parses to a hex string when enableAlpha is true and alpha is 1', () => {
      const utils = setup({ field: { enableAlpha: true } });
      openPicker(utils);

      fireEvent.click(utils.getByTestId('rgba-picker-emit-opaque'));

      expect(utils.props.onChange).toHaveBeenCalledWith('#010203');
    });
  });

  describe('showClearButton', () => {
    it('does not render the clear button when allowInput is true', () => {
      const utils = setup({ field: { allowInput: true }, value: '#ffffff' });
      expect(utils.queryByRole('button', { name: 'editor.editorWidgets.colorstring.clearColorValue' })).toBeNull();
    });

    it('does not render the clear button when value is empty', () => {
      const utils = setup({ field: { allowInput: false }, value: '' });
      expect(utils.queryByRole('button', { name: 'editor.editorWidgets.colorstring.clearColorValue' })).toBeNull();
    });

    it('renders the clear button when allowInput is false and value is set', () => {
      const utils = setup({ field: { allowInput: false }, value: '#ffffff' });
      expect(utils.getByRole('button', { name: 'editor.editorWidgets.colorstring.clearColorValue' }))
        .toBeInTheDocument();
    });

    it('calls onChange with an empty string when the clear button is clicked', () => {
      const utils = setup({ field: { allowInput: false }, value: '#ffffff' });
      fireEvent.click(utils.getByRole('button', { name: 'editor.editorWidgets.colorstring.clearColorValue' }));
      expect(utils.props.onChange).toHaveBeenCalledWith('');
    });
  });

  describe('pickerColor fallback for invalid values', () => {
    it('falls back to opaque black rgba when enableAlpha is true and the value is invalid', () => {
      const utils = setup({ field: { enableAlpha: true }, value: 'not-a-color' });
      openPicker(utils);
      expect(utils.getByTestId('rgba-picker')).toHaveAttribute('data-color', 'rgba(0, 0, 0, 1)');
    });

    it('falls back to black hex when enableAlpha is false and the value is invalid', () => {
      const utils = setup({ field: { enableAlpha: false }, value: 'not-a-color' });
      openPicker(utils);
      expect(utils.getByTestId('hex-picker')).toHaveAttribute('data-color', '#000000');
    });

    it('uses the parsed rgb string when enableAlpha is true and the value is valid', () => {
      const utils = setup({ field: { enableAlpha: true }, value: 'rgba(10, 20, 30, 0.4)' });
      openPicker(utils);
      expect(utils.getByTestId('rgba-picker')).toHaveAttribute(
        'data-color',
        'rgba(10, 20, 30, 0.4)',
      );
    });

    it('uses the parsed hex string when enableAlpha is false and the value is valid', () => {
      const utils = setup({ field: { enableAlpha: false }, value: 'blue' });
      openPicker(utils);
      expect(utils.getByTestId('hex-picker')).toHaveAttribute('data-color', '#0000ff');
    });
  });
});

// DCMS-1083: failed-save validation rendered a visible `ControlErrorsList`
// with no programmatic error state on the underlying input, so
// screen-reader users could not identify which field was invalid.
describe('ColorControl aria validation wiring (DCMS-1083)', () => {
  it('marks a required field as aria-required by default', () => {
    const { container } = setup();
    expect(container.querySelector('input')).toHaveAttribute('aria-required', 'true');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { container } = setup();
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { container } = setup({ hasErrors: true, errorListId: 'color-field-1-errors' });
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage', 'color-field-1-errors');
  });
});
