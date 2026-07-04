import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import BooleanControl from '../BooleanControl';

const defaultProps = {
  forID: 'test-field',
  classNameWrapper: 'wrapper',
  onChange: jest.fn(),
  setActiveStyle: jest.fn(),
  setInactiveStyle: jest.fn(),
};

describe('BooleanControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes value as the Toggle active state (defaultProps value: false)', () => {
    const { getByRole } = render(<BooleanControl {...defaultProps} />);

    const toggle = getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('passes value as the Toggle active state when value is true', () => {
    const { getByRole } = render(<BooleanControl {...defaultProps} value={true} />);

    const toggle = getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('invokes onChange when the toggle is activated', () => {
    const { getByRole } = render(<BooleanControl {...defaultProps} value={false} />);

    const toggle = getByRole('switch');
    fireEvent.click(toggle);

    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange).toHaveBeenCalledWith(true);
  });

  it('invokes setActiveStyle on focus', () => {
    const { getByRole } = render(<BooleanControl {...defaultProps} />);

    const toggle = getByRole('switch');
    fireEvent.focus(toggle);

    expect(defaultProps.setActiveStyle).toHaveBeenCalledTimes(1);
    expect(defaultProps.setInactiveStyle).not.toHaveBeenCalled();
  });

  it('invokes setInactiveStyle on blur', () => {
    const { getByRole } = render(<BooleanControl {...defaultProps} />);

    const toggle = getByRole('switch');
    fireEvent.blur(toggle);

    expect(defaultProps.setInactiveStyle).toHaveBeenCalledTimes(1);
    expect(defaultProps.setActiveStyle).not.toHaveBeenCalled();
  });
});
