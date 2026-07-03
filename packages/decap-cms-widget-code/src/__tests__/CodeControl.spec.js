import React from 'react';
import { fromJS } from 'immutable';
import { render, fireEvent } from '@testing-library/react';

// Real CodeMirror requires layout APIs (getBoundingClientRect) that jsdom
// does not implement. The `allow_language_selection` behavior under test
// lives entirely in the settings pane, not in CodeMirror itself, so stub out
// the editor to keep these tests focused and jsdom-safe.
jest.mock('react-codemirror2', () => ({
  UnControlled: () => null,
}));

import CodeControl from '../CodeControl';

function setup({ fieldConfig = {} } = {}) {
  const field = fromJS({ name: 'code', widget: 'code', ...fieldConfig });
  const props = {
    forID: 'test-code',
    onChange: jest.fn(),
    classNameWrapper: 'classNameWrapper',
    setActiveStyle: jest.fn(),
    setInactiveStyle: jest.fn(),
    widget: { codeMirrorConfig: {} },
    value: fromJS({ code: '', lang: '' }),
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
});
