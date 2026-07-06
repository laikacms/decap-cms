import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import IconButton from '../IconButton';
import { colors } from '../styles';

function setup(overrides = {}) {
  const props = {
    size: 'small',
    isActive: false,
    type: 'arrow',
    onClick: jest.fn(),
    title: 'Go back',
    ...overrides,
  };

  const utils = render(<IconButton {...props} />);
  return { ...utils, props };
}

describe('IconButton', () => {
  it('renders the given Icon type', () => {
    const { container } = setup({ type: 'arrow' });

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('reflects the small size on the rendered button', () => {
    setup({ size: 'small' });

    const button = screen.getByTitle('Go back');
    expect(button).toHaveStyle({ width: '28px', height: '28px' });
  });

  it('reflects the large size on the rendered button', () => {
    setup({ size: 'large' });

    const button = screen.getByTitle('Go back');
    expect(button).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('reflects the active color when isActive is true', () => {
    setup({ isActive: true });

    const button = screen.getByTitle('Go back');
    expect(button).toHaveStyle({ color: colors.active });
  });

  it('reflects the inactive color when isActive is false', () => {
    setup({ isActive: false });

    const button = screen.getByTitle('Go back');
    expect(button).toHaveStyle({ color: colors.inactive });
  });

  it('invokes onClick when clicked', () => {
    const { props } = setup();

    fireEvent.click(screen.getByTitle('Go back'));

    expect(props.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not throw when clicked without an onClick handler', () => {
    setup({ onClick: undefined });

    expect(() => fireEvent.click(screen.getByTitle('Go back'))).not.toThrow();
  });
});
