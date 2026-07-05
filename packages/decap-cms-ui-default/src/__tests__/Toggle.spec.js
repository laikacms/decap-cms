import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import Toggle from '../Toggle';

function setup(overrides = {}) {
  const props = {
    active: false,
    onChange: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    ...overrides,
  };

  const utils = render(<Toggle {...props} />);
  return { ...utils, props };
}

describe('Toggle', () => {
  it('renders with role="switch" and aria-checked matching the active prop', () => {
    const { getByRole } = setup({ active: false });
    const toggle = getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with aria-checked="true" when active is true', () => {
    const { getByRole } = setup({ active: true });
    const toggle = getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('does not render an aria-expanded attribute', () => {
    const { getByRole } = setup({ active: false });
    const toggle = getByRole('switch');
    expect(toggle).not.toHaveAttribute('aria-expanded');
  });

  it('calls onChange with the toggled boolean and flips aria-checked when clicked', () => {
    const { getByRole, props } = setup({ active: false });
    const toggle = getByRole('switch');

    fireEvent.click(toggle);

    expect(props.onChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    expect(props.onChange).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('does not throw when onChange is not provided', () => {
    const { getByRole } = setup({ onChange: undefined });
    const toggle = getByRole('switch');

    expect(() => fireEvent.click(toggle)).not.toThrow();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onFocus when focused', () => {
    const { getByRole, props } = setup();
    const toggle = getByRole('switch');

    fireEvent.focus(toggle);

    expect(props.onFocus).toHaveBeenCalled();
  });

  it('calls onBlur when blurred', () => {
    const { getByRole, props } = setup();
    const toggle = getByRole('switch');

    fireEvent.focus(toggle);
    fireEvent.blur(toggle);

    expect(props.onBlur).toHaveBeenCalled();
  });

  it('renders custom Container, Background, and Handle overrides in place of defaults', () => {
    const Container = jest.fn(({ children, ...rest }) => (
      <div data-testid="custom-container" {...rest}>
        {children}
      </div>
    ));
    const Background = jest.fn(() => <div data-testid="custom-background" />);
    const Handle = jest.fn(() => <div data-testid="custom-handle" />);

    const { getByTestId } = setup({ Container, Background, Handle });

    expect(getByTestId('custom-container')).toBeInTheDocument();
    expect(getByTestId('custom-background')).toBeInTheDocument();
    expect(getByTestId('custom-handle')).toBeInTheDocument();
  });
});
