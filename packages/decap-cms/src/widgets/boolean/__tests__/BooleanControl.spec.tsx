import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import BooleanControl from '@/widgets/boolean/BooleanControl';

const defaultProps = {
  onChange: vi.fn(),
  forID: 'published',
  classNameWrapper: 'boolean-toggle',
  setActiveStyle: vi.fn(),
  setInactiveStyle: vi.fn(),
  field: { name: 'published', widget: 'boolean' },
};

// DCMS-1029: pin the documented `value = false` fallback (see README.md) so
// a field with no `default:` key and no saved value renders as an unchecked
// toggle rather than blank/indeterminate.
describe('BooleanControl default value fallback (DCMS-1029)', () => {
  it('renders unchecked when no value prop is passed', () => {
    const { container } = render(<BooleanControl {...defaultProps} />);
    expect(container.querySelector('button')).toHaveAttribute('aria-checked', 'false');
  });
});

// DCMS-1086: PR #1085 wired aria-invalid/aria-required/aria-errormessage
// into string/text/number/colorstring/datetime/select/richtext, but skipped
// boolean entirely. Threading the same wiring through the underlying switch
// button keeps this widget consistent even though a `false` value alone
// can't currently fail the presence validator.
describe('BooleanControl aria validation wiring (DCMS-1086)', () => {
  it('marks a required field as aria-required by default', () => {
    const { container } = render(<BooleanControl {...defaultProps} value={false} />);
    expect(container.querySelector('button')).toHaveAttribute('aria-required', 'true');
  });

  it('does not mark an explicitly optional field as aria-required', () => {
    const { container } = render(
      <BooleanControl {...defaultProps} field={{ ...defaultProps.field, required: false }} value={false} />,
    );
    expect(container.querySelector('button')).toHaveAttribute('aria-required', 'false');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { container } = render(<BooleanControl {...defaultProps} value={false} />);
    expect(container.querySelector('button')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { container } = render(
      <BooleanControl {...defaultProps} value={false} hasErrors errorListId="published-field-1-errors" />,
    );
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('aria-invalid', 'true');
    expect(button).toHaveAttribute('aria-errormessage', 'published-field-1-errors');
  });

  it('keeps the toggle id wired to forID for the focus-first-invalid heuristic', () => {
    const { container } = render(<BooleanControl {...defaultProps} value={false} />);
    expect(container.querySelector('button')).toHaveAttribute('id', 'published');
  });
});
