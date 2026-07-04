import React from 'react';
import { render } from '@testing-library/react';

import GiteaAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  PkceAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
}));

describe('GiteaAuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to the default auth_endpoint when none is configured', () => {
    const { PkceAuthenticator } = require('decap-cms-lib-auth');

    render(<GiteaAuthenticationPage {...baseProps} />);

    expect(PkceAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_endpoint: 'login/oauth/authorize',
      }),
    );
  });

  it('honors a custom auth_endpoint from config.backend', () => {
    const { PkceAuthenticator } = require('decap-cms-lib-auth');

    const props = {
      ...baseProps,
      config: {
        backend: {
          base_url: 'https://gitea.example.com',
          app_id: 'app-id',
          auth_endpoint: 'custom/oauth/authorize',
        },
      },
    };

    render(<GiteaAuthenticationPage {...props} />);

    expect(PkceAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        base_url: 'https://gitea.example.com',
        app_id: 'app-id',
        auth_endpoint: 'custom/oauth/authorize',
      }),
    );
  });
});
