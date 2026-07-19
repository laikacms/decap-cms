import React from 'react';
import { fromJS, Map } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

// Real CodeMirror requires layout APIs (getBoundingClientRect) that jsdom
// does not implement, so stub out the editor to keep these tests focused and
// jsdom-safe. The stub exposes a plain textarea wired to the same
// editorDidMount/onChange contract CodeControl expects from the real
// UnControlled component, so both the settings-pane behaviors
// (allow_language_selection) and the persisted-value behaviors
// (output_code_only, keys) can be exercised.
jest.mock('react-codemirror2', () => ({
  UnControlled: ({ value, onChange, editorDidMount, onFocus, onBlur }) => {
    const cm = {
      doc: {
        getCursor: () => ({}),
        listSelections: () => [],
        setCursor: () => {},
        setSelections: () => {},
      },
      focus: () => {},
      getWrapperElement: () => ({ offsetHeight: 0 }),
    };
    // Call synchronously rather than via useEffect: the mock factory can't
    // reference out-of-scope variables (including React), and CodeControl
    // only needs `editorDidMount` to have run before a change event fires.
    editorDidMount?.(cm);
    return (
      <textarea
        data-testid="code-mirror-stub"
        value={value || ''}
        onChange={e => onChange(cm, {}, e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  },
}));

import CodeControl, { languages } from '../CodeControl';
import languageData from '../../data/languages.json';

function setup({ fieldConfig = {}, value = fromJS({ code: '', lang: '' }) } = {}) {
  const field = fromJS({ name: 'code', widget: 'code', ...fieldConfig });
  const props = {
    forID: 'test-code',
    onChange: jest.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: jest.fn(),
    setInactiveStyle: jest.fn(),
    widget: { codeMirrorConfig: {} },
    value,
    field,
  };

  const utils = render(<CodeControl {...props} />);
  fireEvent.click(utils.getByRole('button'));
  return { ...utils, props };
}

describe('CodeControl', () => {
  describe('allow_language_selection', () => {
    it('hides the language selector when allow_language_selection is omitted (default)', () => {
      const { queryByText } = setup();
      expect(queryByText('Mode')).not.toBeInTheDocument();
    });

    it('hides the language selector when allow_language_selection is false', () => {
      const { queryByText } = setup({ fieldConfig: { allow_language_selection: false } });
      expect(queryByText('Mode')).not.toBeInTheDocument();
    });

    it('shows the language selector when allow_language_selection is true', () => {
      const { queryByText } = setup({ fieldConfig: { allow_language_selection: true } });
      expect(queryByText('Mode')).toBeInTheDocument();
    });
  });

  describe('output_code_only (DCMS-516)', () => {
    it('persists an Immutable Map keyed by the default `code`/`lang` keys when output_code_only is omitted', () => {
      const { getByTestId, props } = setup();
      fireEvent.change(getByTestId('code-mirror-stub'), { target: { value: 'console.log(1)' } });

      expect(props.onChange).toHaveBeenCalled();
      const persisted = props.onChange.mock.calls[0][0];
      expect(Map.isMap(persisted)).toBe(true);
      expect(persisted.get('code')).toBe('console.log(1)');
    });

    it('persists an Immutable Map keyed by custom `keys.code`/`keys.lang` when configured', () => {
      const { getByTestId, props } = setup({
        fieldConfig: { keys: { code: 'body', lang: 'language' } },
        value: fromJS({}),
      });
      fireEvent.change(getByTestId('code-mirror-stub'), { target: { value: 'console.log(2)' } });

      const persisted = props.onChange.mock.calls[0][0];
      expect(Map.isMap(persisted)).toBe(true);
      expect(persisted.get('body')).toBe('console.log(2)');
      expect(persisted.has('code')).toBe(false);
    });

    it('persists a bare string when output_code_only is true', () => {
      const { getByTestId, props } = setup({ fieldConfig: { output_code_only: true } });
      fireEvent.change(getByTestId('code-mirror-stub'), { target: { value: 'console.log(3)' } });

      const persisted = props.onChange.mock.calls[0][0];
      expect(typeof persisted).toBe('string');
      expect(persisted).toBe('console.log(3)');
    });
  });

  describe('languages with empty identifiers (DCMS-485)', () => {
    it('every language resolves to a defined, non-empty name', () => {
      expect(languages.every(lang => !!lang.name)).toBe(true);
    });

    it('every language resolves to a unique dropdown value', () => {
      const names = languages.map(lang => lang.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('assigns distinct names to each language with an empty identifiers array', () => {
      const emptyIdentifierLabels = languageData
        .filter(lang => lang.identifiers.length === 0)
        .map(lang => lang.label);
      expect(emptyIdentifierLabels.length).toBeGreaterThan(0);

      const names = emptyIdentifierLabels.map(
        label => languages.find(lang => lang.label === label).name,
      );
      expect(names).not.toContain(undefined);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
