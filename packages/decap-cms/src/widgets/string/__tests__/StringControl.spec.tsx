import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import StringControl from '@/widgets/string/StringControl';

const RLO = String.fromCharCode(0x202e);

const defaultProps = {
  onChange: vi.fn(),
  forID: 'title',
  classNameWrapper: 'string-input',
  setActiveStyle: vi.fn(),
  setInactiveStyle: vi.fn(),
  field: { name: 'title', widget: 'string' } as any,
  t: ((key: string) => key) as any,
};

// DCMS-415 / DCMS-429: string widgets accepted invisible Unicode bidi
// override characters (e.g. U+202E RLO) with no warning to the editor. This
// fix was ported from origin/main to v4.beta.
describe('StringControl bidi control warning (DCMS-415 / DCMS-429)', () => {
  it('does not render a warning badge for a plain value', () => {
    const { queryByRole } = render(<StringControl {...defaultProps} value="admin.txt.exe" />);
    expect(queryByRole('alert')).toBeNull();
  });

  it('renders a warning badge when the value contains a bidi control character', () => {
    const { getByRole } = render(<StringControl {...defaultProps} value={`admin${RLO}txt.exe`} />);
    expect(getByRole('alert')).toBeInTheDocument();
  });

  it('does not mutate the input value when bidi controls are present', () => {
    const trojanValue = `admin${RLO}txt.exe`;
    const { container } = render(<StringControl {...defaultProps} value={trojanValue} />);
    const input = container.querySelector('input');
    expect(input?.value).toBe(trojanValue);
  });
});

// DCMS-1083: failed-save validation rendered a visible `ControlErrorsList`
// with no programmatic error state on the underlying input, so
// screen-reader users could not identify which field was invalid.
describe('StringControl aria validation wiring (DCMS-1083)', () => {
  it('marks a required field as aria-required by default', () => {
    const { container } = render(<StringControl {...defaultProps} value="" />);
    expect(container.querySelector('input')).toHaveAttribute('aria-required', 'true');
  });

  it('does not mark an explicitly optional field as aria-required', () => {
    const { container } = render(
      <StringControl {...defaultProps} field={{ ...defaultProps.field, required: false }} value="" />,
    );
    expect(container.querySelector('input')).toHaveAttribute('aria-required', 'false');
  });

  it('has no aria-invalid when the field has no errors', () => {
    const { container } = render(<StringControl {...defaultProps} value="" />);
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-invalid and aria-errormessage when the field has errors', () => {
    const { container } = render(
      <StringControl {...defaultProps} value="" hasErrors errorListId="title-field-1-errors" />,
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage', 'title-field-1-errors');
  });
});
