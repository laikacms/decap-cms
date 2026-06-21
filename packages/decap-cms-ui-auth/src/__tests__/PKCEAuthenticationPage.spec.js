import React from 'react';
import { render } from '@testing-library/react';

import PKCEAuthenticationPage from '../PKCEAuthenticationPage';

// A minimal JWT (header.payload.signature) — payload encodes { email: 'user@example.com' }
const mockIdToken =
  'eyJhbGciOiJSUzI1NiJ9.' +
  btoa(JSON.stringify({ email: 'user@example.com' })).replace(/=+$/, '') +
  '.sig';

jest.mock('decap-cms-lib-auth', () => {
  // Variables referenced inside jest.mock must be prefixed "mock" (case-insensitive)
  const mockRawToken =
    'eyJhbGciOiJSUzI1NiJ9.' +
    btoa(JSON.stringify({ email: 'user@example.com' })).replace(/=+$/, '') +
    '.sig';

  return {
    PkceAuthenticator: jest.fn().mockImplementation(() => ({
      completeAuth: jest.fn(cb => {
        cb(null, {
          access_token: null,
          id_token: mockRawToken,
          user_metadata: {},
        });
      }),
      authenticate: jest.fn(),
    })),
  };
});

jest.mock('jwt-decode', () => jest.fn(() => ({ email: 'user@example.com' })));

describe('PKCEAuthenticationPage', () => {
  const baseConfig = {
    backend: {},
    auth: {},
  };

  const baseProps = {
    config: baseConfig,
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes idToken (camelCase) equal to raw id_token in onLogin callback', () => {
    render(<PKCEAuthenticationPage {...baseProps} />);

    expect(baseProps.onLogin).toHaveBeenCalledTimes(1);
    const loginArg = baseProps.onLogin.mock.calls[0][0];
    expect(loginArg.idToken).toBe(mockIdToken);
  });

  it('does not set idToken when id_token is absent', () => {
    const { PkceAuthenticator } = require('decap-cms-lib-auth');
    PkceAuthenticator.mockImplementationOnce(() => ({
      completeAuth: jest.fn(cb => {
        cb(null, {
          access_token: null,
          user_metadata: {},
        });
      }),
      authenticate: jest.fn(),
    }));

    render(<PKCEAuthenticationPage {...baseProps} />);

    expect(baseProps.onLogin).toHaveBeenCalledTimes(1);
    const loginArg = baseProps.onLogin.mock.calls[0][0];
    expect(loginArg.idToken).toBeUndefined();
  });

  describe('config.auth.* overrides config.backend.* for shared keys', () => {
    it('prefers auth.base_url over backend.base_url', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: {
          backend: {
            base_url: 'https://backend.example.com',
            app_id: 'backend-app-id',
            auth_endpoint: 'backend/authorize',
            auth_token_endpoint: 'backend/token',
          },
          auth: {
            base_url: 'https://auth.example.com',
            app_id: 'auth-app-id',
            auth_endpoint: 'auth/authorize',
            auth_token_endpoint: 'auth/token',
          },
        },
      };

      render(<PKCEAuthenticationPage {...props} />);

      expect(PkceAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          base_url: 'https://auth.example.com',
          app_id: 'auth-app-id',
          auth_endpoint: 'auth/authorize',
          auth_token_endpoint: 'auth/token',
        }),
      );
    });

    it('falls back to backend.* when auth.* keys are absent', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: {
          backend: {
            base_url: 'https://backend.example.com',
            app_id: 'backend-app-id',
          },
          auth: {},
        },
      };

      render(<PKCEAuthenticationPage {...props} />);

      expect(PkceAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          base_url: 'https://backend.example.com',
          app_id: 'backend-app-id',
        }),
      );
    });
  });
});
