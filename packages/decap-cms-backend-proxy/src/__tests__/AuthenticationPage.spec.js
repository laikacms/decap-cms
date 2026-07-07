import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import AuthenticationPage from '../AuthenticationPage';

function setup(overrides = {}) {
  const props = {
    config: {},
    inProgress: false,
    onLogin: jest.fn(),
    t: jest.fn(key => key),
    ...overrides,
  };

  const utils = render(<AuthenticationPage {...props} />);
  return { ...utils, props };
}

describe('AuthenticationPage', () => {
  it('calls onLogin with component state when the login button is clicked', () => {
    const onLogin = jest.fn();

    setup({ onLogin });

    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith(null);
  });

  it('shows the logging-in label and disables the button while inProgress', () => {
    setup({ inProgress: true });

    const button = screen.getByRole('button', { name: 'auth.loggingIn' });
    expect(button).toBeDisabled();
  });

  it('does not render a GoBackButton when config.site_url is not set', () => {
    setup();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a GoBackButton when config.site_url is set', () => {
    setup({ config: { site_url: 'https://example.com' } });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders the default logo when neither config.logo.src nor config.logo_url is set', () => {
    const { container } = setup();

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the custom logo image when config.logo.src is set', () => {
    const { container } = setup({ config: { logo: { src: '/logo-src.png' } } });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/logo-src.png');
  });

  it('renders the custom logo image when config.logo_url is set', () => {
    const { container } = setup({ config: { logo_url: '/logo-url.png' } });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/logo-url.png');
  });

  it('prefers config.logo.src over config.logo_url when both are set', () => {
    const { container } = setup({
      config: { logo: { src: '/logo-src.png' }, logo_url: '/logo-url.png' },
    });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/logo-src.png');
  });
});
