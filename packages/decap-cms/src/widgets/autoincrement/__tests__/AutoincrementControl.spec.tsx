import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AutoincrementControl from '@/widgets/autoincrement/AutoincrementControl';

const defaultProps = {
  onChange: vi.fn(),
  forID: 'test-autoincrement',
  classNameWrapper: '',
  setActiveStyle: vi.fn(),
  setInactiveStyle: vi.fn(),
  field: { name: 'ticketId', widget: 'autoincrement' } as any,
};

describe('AutoincrementControl', () => {
  it('never calls onChange on mount (value is computed at entry-creation time, not by the control)', () => {
    const onChange = vi.fn();
    render(<AutoincrementControl {...defaultProps} onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('displays the value already written into the draft', () => {
    const { container } = render(<AutoincrementControl {...defaultProps} value={42} />);
    expect(container.querySelector('input')?.value).toBe('42');
  });

  it('renders read-only by default', () => {
    const { container } = render(<AutoincrementControl {...defaultProps} value={1} />);
    expect(container.querySelector('input')).toHaveAttribute('readonly');
  });

  it('is editable when read_only is false', () => {
    const { container } = render(
      <AutoincrementControl
        {...defaultProps}
        value={1}
        field={{ name: 'ticketId', widget: 'autoincrement', read_only: false } as any}
      />,
    );
    expect(container.querySelector('input')).not.toHaveAttribute('readonly');
  });

  it('reports a manual numeric override via onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AutoincrementControl
        {...defaultProps}
        onChange={onChange}
        value={1}
        field={{ name: 'ticketId', widget: 'autoincrement', read_only: false } as any}
      />,
    );

    const input = container.querySelector('input')!;
    input.focus();
    Object.defineProperty(input, 'value', { writable: true, value: '99' });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith(99);
  });

  it('reports an empty value as an empty string, not NaN', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AutoincrementControl
        {...defaultProps}
        onChange={onChange}
        value={1}
        field={{ name: 'ticketId', widget: 'autoincrement', read_only: false } as any}
      />,
    );

    const input = container.querySelector('input')!;
    Object.defineProperty(input, 'value', { writable: true, value: '' });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
