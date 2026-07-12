import React from 'react';
import { render, screen } from '@testing-library/react';

import GoBackButton from '../GoBackButton';

function setup(overrides = {}) {
  const props = {
    href: '/admin/',
    t: jest.fn(key => key),
    ...overrides,
  };

  const utils = render(<GoBackButton {...props} />);
  return { ...utils, props };
}

describe('GoBackButton', () => {
  it('renders an anchor using the href prop', () => {
    setup({ href: '/some/path' });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/some/path');
  });

  it('calls the t prop to resolve its label text', () => {
    const { props } = setup();

    expect(props.t).toHaveBeenCalledWith('ui.default.goBackToSite');
    expect(screen.getByText('ui.default.goBackToSite')).toBeInTheDocument();
  });

  it('renders the arrow icon', () => {
    const { container } = setup();

    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
