import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import StringControl from '../StringControl';

const defaultProps = {
  onChange: jest.fn(),
  forID: 'test-field',
  value: 'hello',
  classNameWrapper: 'wrapper',
  setActiveStyle: jest.fn(),
  setInactiveStyle: jest.fn(),
};

describe('StringControl cursor-preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores event selectionStart into _sel after handleChange fires', () => {
    const compRef = React.createRef();
    const { container } = render(<StringControl ref={compRef} {...defaultProps} />);
    const input = container.querySelector('input');

    Object.defineProperty(input, 'selectionStart', { writable: true, value: 3 });
    fireEvent.change(input, { target: { value: 'helo', selectionStart: 3 } });

    expect(compRef.current._sel).toBe(3);
  });

  it('calls setSelectionRange(_sel, _sel) in componentDidUpdate when selectionStart has drifted', () => {
    const { container, rerender } = render(<StringControl {...defaultProps} value="hello" />);
    const input = container.querySelector('input');

    const setSelectionRange = jest.fn();
    input.setSelectionRange = setSelectionRange;

    // Trigger handleChange: stores _sel = 3
    Object.defineProperty(input, 'selectionStart', { writable: true, value: 3 });
    fireEvent.change(input, { target: { value: 'helo', selectionStart: 3 } });

    // Simulate browser moving cursor to end (drift: selectionStart is now 4, not 3)
    Object.defineProperty(input, 'selectionStart', { writable: true, value: 4 });

    // Re-render triggers componentDidUpdate
    rerender(<StringControl {...defaultProps} value="helo" />);

    expect(setSelectionRange).toHaveBeenCalledWith(3, 3);
  });

  it('does NOT call setSelectionRange when selectionStart already equals _sel', () => {
    const { container, rerender } = render(<StringControl {...defaultProps} value="hello" />);
    const input = container.querySelector('input');

    const setSelectionRange = jest.fn();
    input.setSelectionRange = setSelectionRange;

    // Trigger handleChange: stores _sel = 3
    Object.defineProperty(input, 'selectionStart', { writable: true, value: 3 });
    fireEvent.change(input, { target: { value: 'helo', selectionStart: 3 } });

    // No drift: selectionStart stays at 3
    Object.defineProperty(input, 'selectionStart', { writable: true, value: 3 });

    rerender(<StringControl {...defaultProps} value="helo" />);

    expect(setSelectionRange).not.toHaveBeenCalled();
  });
});
