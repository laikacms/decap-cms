import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import TextControl from '@/widgets/text/TextControl';

const RLO = String.fromCharCode(0x202e);

const defaultProps = {
  onChange: vi.fn(),
  forID: 'body',
  classNameWrapper: 'text-input',
  setActiveStyle: vi.fn(),
  setInactiveStyle: vi.fn(),
  field: { name: 'body', widget: 'text' } as any,
  t: ((key: string) => key) as any,
};

// DCMS-415 / DCMS-429: text widgets accepted invisible Unicode bidi
// override characters (e.g. U+202E RLO) with no warning to the editor.
// Ported from origin/main to v4.beta.
describe('TextControl bidi control warning (DCMS-415 / DCMS-429)', () => {
  it('does not render a warning badge for a plain value', () => {
    const { queryByRole } = render(<TextControl {...defaultProps} value="admin.txt.exe" />);
    expect(queryByRole('alert')).toBeNull();
  });

  it('renders a warning badge when the value contains a bidi control character', () => {
    const { getByRole } = render(<TextControl {...defaultProps} value={`admin${RLO}txt.exe`} />);
    expect(getByRole('alert')).toBeInTheDocument();
  });

  it('does not mutate the textarea value when bidi controls are present', () => {
    const trojanValue = `admin${RLO}txt.exe`;
    const { container } = render(<TextControl {...defaultProps} value={trojanValue} />);
    const textarea = container.querySelector('textarea');
    expect(textarea?.value).toBe(trojanValue);
  });
});
