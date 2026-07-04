import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import TextControl from '../TextControl';

const defaultProps = {
  onChange: jest.fn(),
  forID: 'test-field',
  value: 'hello',
  classNameWrapper: 'wrapper',
  setActiveStyle: jest.fn(),
  setInactiveStyle: jest.fn(),
};

describe('TextControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a textarea reflecting the value prop', () => {
    const { container } = render(<TextControl {...defaultProps} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('hello');
  });

  it('renders an empty textarea when value is falsy', () => {
    const { container } = render(<TextControl {...defaultProps} value={undefined} />);
    const textarea = container.querySelector('textarea');
    expect(textarea.value).toBe('');
  });

  it('updates the rendered value when the value prop changes', () => {
    const { container, rerender } = render(<TextControl {...defaultProps} value="hello" />);
    const textarea = container.querySelector('textarea');
    expect(textarea.value).toBe('hello');

    rerender(<TextControl {...defaultProps} value="updated" />);
    expect(textarea.value).toBe('updated');
  });

  it('calls onChange with the new value when the textarea changes', () => {
    const onChange = jest.fn();
    const { container } = render(<TextControl {...defaultProps} onChange={onChange} />);
    const textarea = container.querySelector('textarea');

    fireEvent.change(textarea, { target: { value: 'hello world' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('hello world');
  });
});
