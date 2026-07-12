import React from 'react';
import { render, fireEvent } from '@testing-library/react';

// react-select renders a complex, portal-based UI that is awkward to drive
// through jsdom. The behavior under test here — conditional rendering and
// the opt.value unwrapping in SettingsSelect's onChange — lives entirely in
// SettingsPane, so stub react-select with a minimal control that exposes an
// inputId-addressable trigger for onChange.
jest.mock('react-select', () => {
  return function MockSelect({ inputId, onChange }) {
    return (
      <button
        data-testid={inputId}
        onClick={() => onChange({ value: 'new-value', label: 'new-value' })}
      />
    );
  };
});

import SettingsPane from '../SettingsPane';

function setup(overrides = {}) {
  const props = {
    hideSettings: jest.fn(),
    forID: 'test-code',
    modes: [{ value: 'javascript', label: 'JavaScript' }],
    mode: { value: 'javascript', label: 'JavaScript' },
    theme: 'default',
    themes: undefined,
    keyMap: { value: 'default', label: 'Default' },
    keyMaps: [{ value: 'default', label: 'Default' }],
    allowLanguageSelection: false,
    onChangeLang: jest.fn(),
    onChangeTheme: jest.fn(),
    onChangeKeyMap: jest.fn(),
    ...overrides,
  };

  const utils = render(<SettingsPane {...props} />);
  return { ...utils, props };
}

describe('SettingsPane', () => {
  describe('allowLanguageSelection', () => {
    it('does not render the Field Settings section when allowLanguageSelection is false', () => {
      const { queryByText } = setup({ allowLanguageSelection: false });
      expect(queryByText('Field Settings')).not.toBeInTheDocument();
      expect(queryByText('Mode')).not.toBeInTheDocument();
    });

    it('renders the Field Settings section when allowLanguageSelection is true', () => {
      const { queryByText } = setup({ allowLanguageSelection: true });
      expect(queryByText('Field Settings')).toBeInTheDocument();
      expect(queryByText('Mode')).toBeInTheDocument();
    });
  });

  describe('themes', () => {
    it('does not render the Theme select when themes is not provided', () => {
      const { queryByText } = setup({ themes: undefined });
      expect(queryByText('Theme')).not.toBeInTheDocument();
    });

    it('renders the Theme select when themes is provided', () => {
      const { queryByText } = setup({ themes: ['default', 'dracula'] });
      expect(queryByText('Theme')).toBeInTheDocument();
    });
  });

  describe('Esc key handling', () => {
    it('calls hideSettings when Esc is pressed', () => {
      const { container, props } = setup();
      fireEvent.keyDown(container.firstChild, { key: 'Escape', which: 27, keyCode: 27 });
      expect(props.hideSettings).toHaveBeenCalledTimes(1);
    });

    it('does not call hideSettings for a non-Esc key', () => {
      const { container, props } = setup();
      fireEvent.keyDown(container.firstChild, { key: 'a', which: 65, keyCode: 65 });
      expect(props.hideSettings).not.toHaveBeenCalled();
    });
  });

  describe('SettingsSelect onChange', () => {
    it('unwraps opt.value before calling onChangeLang', () => {
      const { getByTestId, props } = setup({ allowLanguageSelection: true });
      fireEvent.click(getByTestId('test-code-select-mode'));
      expect(props.onChangeLang).toHaveBeenCalledWith('new-value');
    });

    it('unwraps opt.value before calling onChangeTheme', () => {
      const { getByTestId, props } = setup({ themes: ['default', 'dracula'] });
      fireEvent.click(getByTestId('test-code-select-theme'));
      expect(props.onChangeTheme).toHaveBeenCalledWith('new-value');
    });

    it('unwraps opt.value before calling onChangeKeyMap', () => {
      const { getByTestId, props } = setup();
      fireEvent.click(getByTestId('test-code-select-keymap'));
      expect(props.onChangeKeyMap).toHaveBeenCalledWith('new-value');
    });
  });
});
