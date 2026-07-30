import React from 'react';
import { render, screen } from '@testing-library/react';
import { fromJS, Map } from 'immutable';

import { EditorControl } from '../EditorControl';
import { registerWidget } from '../../../../lib/registry';

// EditorControl derives its `uniqueFieldId` (and therefore the errors-map key
// it looks itself up under, and the `ControlErrorsList` id it's asserted
// against below) from `lodash/uniqueId`, which is a shared, order-dependent
// module-level counter. Pin it to a deterministic value so the "failed save"
// test can key `fieldsErrors` without depending on test execution order.
jest.mock('lodash/uniqueId', () => prefix => `${prefix}1`);

// DCMS-1743: leaf field inputs carried no programmatic error state on failed
// save (no `aria-invalid`, `aria-required`, `aria-errormessage`/
// `aria-describedby`), porting the fix v4.beta landed under DCMS-1083/
// DCMS-1086. `EditorControl` is responsible for computing `hasErrors` and a
// stable `errorListId` and threading them (via `Widget`, exercised directly
// here since `EditorControl` renders `Widget` itself) down to
// `controlComponent`.
// Mirrors how a real leaf control (e.g. StringControl) uses the props
// `Widget` threads down: `field` to compute `aria-required` itself, and
// `hasErrors`/`errorListId` (sourced from `EditorControl`) for the rest.
function DummyControl(props) {
  return (
    <input
      data-testid="leaf-input"
      id={props.forID}
      aria-required={props.field.get('required') !== false}
      aria-invalid={props.hasErrors ? 'true' : undefined}
      aria-errormessage={props.hasErrors ? props.errorListId : undefined}
      readOnly
    />
  );
}

beforeAll(() => {
  registerWidget('dcms1743-dummy', DummyControl);
});

const baseProps = {
  entry: fromJS({}),
  collection: {},
  config: fromJS({}),
  mediaPaths: fromJS({}),
  boundGetAsset: () => () => {},
  onChange: () => {},
  openMediaLibrary: () => {},
  addAsset: () => {},
  removeInsertedMedia: () => {},
  persistMedia: () => {},
  query: () => {},
  queryHits: {},
  clearSearch: () => {},
  clearFieldErrors: () => {},
  loadEntry: () => {},
  quickCreateEntry: () => {},
  t: key => key,
  parentIds: [],
  isDisabled: false,
  isHidden: false,
  isFieldDuplicate: () => false,
  isFieldHidden: () => false,
  locale: undefined,
  isParentListCollapsed: false,
};

function makeField(overrides = {}) {
  return fromJS({
    name: 'title',
    label: 'Title',
    widget: 'dcms1743-dummy',
    required: true,
    ...overrides,
  });
}

describe('EditorControl aria-invalid/aria-required/aria-errormessage threading (DCMS-1743)', () => {
  it('marks a required field aria-required on the leaf control, with no error state before save', () => {
    render(<EditorControl {...baseProps} field={makeField()} value="" fieldsErrors={fromJS({})} />);

    const input = screen.getByTestId('leaf-input');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-errormessage');
  });

  it('does not mark a non-required field aria-required', () => {
    render(
      <EditorControl
        {...baseProps}
        field={makeField({ required: false })}
        value=""
        fieldsErrors={fromJS({})}
      />,
    );

    const input = screen.getByTestId('leaf-input');
    expect(input).toHaveAttribute('aria-required', 'false');
  });

  it('threads aria-invalid and a stable aria-errormessage id pointing at the rendered ControlErrorsList on failed save', () => {
    const field = makeField();
    // `fieldsErrors` holds plain-JS error arrays keyed by uniqueFieldId (see
    // the `SET_FIELD_ERRORS` reducer case in entryDraft.js, which
    // `setIn`s `action.payload.errors` verbatim, not through `fromJS`) - only
    // the outer map is Immutable.
    const fieldsErrors = Map({
      'title-field-1': [{ type: 'PRESENCE', message: 'Title is required' }],
    });

    render(
      <EditorControl
        {...baseProps}
        field={field}
        value=""
        fieldsErrors={fieldsErrors}
        // uniqueFieldId is generated from field name via uniqueId(), so drive
        // the assertion off whatever `ControlErrorsList` id EditorControl
        // actually renders instead of hardcoding "title-field-1".
      />,
    );

    const input = screen.getByTestId('leaf-input');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const errorMessageId = input.getAttribute('aria-errormessage');
    expect(errorMessageId).toBeTruthy();

    const errorList = document.getElementById(errorMessageId);
    expect(errorList).not.toBeNull();
    expect(errorList.tagName).toBe('UL');
    expect(errorList.textContent).toContain('Title is required');
  });
});
