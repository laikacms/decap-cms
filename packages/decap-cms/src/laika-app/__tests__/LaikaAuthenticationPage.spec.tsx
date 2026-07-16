import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import LaikaAuthenticationPage from '@/laika-app/LaikaAuthenticationPage';

const baseProps = {
  AuthComponent: function MockAuth(props: { onLogin: () => void }) {
    return <button onClick={props.onLogin}>Sign in with GitHub</button>;
  } as any,
  onLogin: vi.fn(),
  error: null,
  inProgress: false,
  config: {
    site_name: 'Demo Site',
    backend: { name: 'github' },
    logo: { src: '/logo.svg' },
  } as any,
  clearHash: vi.fn(),
  t: (key: string) => key,
};

describe('LaikaAuthenticationPage', () => {
  it('renders the site name + logo + supplied AuthComponent', () => {
    const { getByText, getByRole, getByAltText } = render(
      <LaikaAuthenticationPage {...baseProps} />,
    );
    expect(getByText('Demo Site')).toBeInTheDocument();
    expect(getByAltText('Demo Site')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
  });

  it('shows the waiting message when AuthComponent is null', () => {
    const { getByText, queryByRole } = render(
      <LaikaAuthenticationPage {...baseProps} AuthComponent={null} />,
    );
    expect(getByText('app.app.waitingBackend')).toBeInTheDocument();
    expect(queryByRole('button')).toBeNull();
  });

  it('renders the tagline when supplied', () => {
    const { getByText } = render(
      <LaikaAuthenticationPage {...baseProps} tagline="Write, save, ship." />,
    );
    expect(getByText('Write, save, ship.')).toBeInTheDocument();
  });

  it('falls back to "Content Manager" when no site name is set', () => {
    const { getByText } = render(
      <LaikaAuthenticationPage {...baseProps} config={{ backend: { name: 'github' } } as any} />,
    );
    expect(getByText('Content Manager')).toBeInTheDocument();
  });
});
