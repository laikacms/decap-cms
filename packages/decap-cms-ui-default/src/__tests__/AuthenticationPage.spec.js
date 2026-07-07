import React from 'react';
import { render, screen } from '@testing-library/react';

import AuthenticationPage, { renderPageLogo } from '../AuthenticationPage';

function setup(overrides = {}) {
  const props = {
    t: jest.fn(key => key),
    ...overrides,
  };

  const utils = render(<AuthenticationPage {...props} />);
  return { ...utils, props };
}

describe('renderPageLogo', () => {
  it('renders a custom logo image when a logoUrl is provided', () => {
    const { container } = render(renderPageLogo('/path/to/logo.png'));

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/path/to/logo.png');
    expect(img).toHaveAttribute('alt', 'Logo');
  });

  it('renders the default Decap logo icon when no logoUrl is provided', () => {
    const { container } = render(renderPageLogo());

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('AuthenticationPage', () => {
  it('renders the default logo when neither logoUrl nor logo.src is provided', () => {
    const { container } = setup();

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('prefers the deprecated logoUrl prop over logo.src', () => {
    const { container } = setup({
      logoUrl: '/deprecated-logo.png',
      logo: { src: '/logo-src.png' },
    });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/deprecated-logo.png');
  });

  it('falls back to logo.src when logoUrl is not provided', () => {
    const { container } = setup({ logo: { src: '/logo-src.png' } });

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/logo-src.png');
  });

  it('does not render a login error message by default', () => {
    setup();

    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('renders the login error message when provided', () => {
    setup({ loginErrorMessage: 'Something went wrong' });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not call renderPageContent when it is not provided', () => {
    const { container } = setup();

    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('calls renderPageContent with LoginButton, TextButton, and showAbortButton', () => {
    const renderPageContent = jest.fn(() => <div data-testid="page-content" />);

    setup({ renderPageContent, siteUrl: undefined });

    expect(renderPageContent).toHaveBeenCalledWith(
      expect.objectContaining({ showAbortButton: true }),
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('passes showAbortButton as false to renderPageContent when siteUrl is set', () => {
    const renderPageContent = jest.fn(() => null);

    setup({ renderPageContent, siteUrl: 'https://example.com' });

    expect(renderPageContent).toHaveBeenCalledWith(
      expect.objectContaining({ showAbortButton: false }),
    );
  });

  it('does not render a login button when renderButtonContent is not provided', () => {
    setup();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a login button using renderButtonContent and wires up onLogin/loginDisabled', () => {
    const onLogin = jest.fn();
    const renderButtonContent = jest.fn(() => 'Log in');

    setup({ onLogin, renderButtonContent, loginDisabled: true });

    const button = screen.getByRole('button', { name: 'Log in' });
    expect(button).toBeDisabled();
    expect(renderButtonContent).toHaveBeenCalled();
  });

  it('does not render a GoBackButton when siteUrl is not provided', () => {
    setup();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a GoBackButton when siteUrl is provided', () => {
    setup({ siteUrl: '/admin/' });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/');
  });

  it('does not render the Netlify credit icon when there is no authLogoUrl', () => {
    const { container } = setup();

    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders the Netlify credit icon when authLogoUrl is present', () => {
    const { container } = setup({ logoUrl: '/logo.png' });

    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});
