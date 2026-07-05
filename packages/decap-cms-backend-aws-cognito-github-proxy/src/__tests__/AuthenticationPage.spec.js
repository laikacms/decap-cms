import React from 'react';
import { render, act } from '@testing-library/react';

import GenericPKCEAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  PkceAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
}));

describe('GenericPKCEAuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs PkceAuthenticator with default base_url/app_id/auth_endpoint/auth_token_endpoint when config.backend omits them', () => {
    const { PkceAuthenticator } = require('decap-cms-lib-auth');

    render(<GenericPKCEAuthenticationPage {...baseProps} />);

    expect(PkceAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        base_url: '',
        app_id: '',
        auth_endpoint: 'oauth2/authorize',
        auth_token_endpoint: 'oauth2/token',
        auth_token_endpoint_content_type: 'application/x-www-form-urlencoded; charset=utf-8',
      }),
    );
  });

  it('constructs PkceAuthenticator with values from config.backend when provided', () => {
    const { PkceAuthenticator } = require('decap-cms-lib-auth');

    const props = {
      ...baseProps,
      config: {
        backend: {
          base_url: 'https://cognito.example.com',
          app_id: 'app-id',
          auth_endpoint: 'custom/authorize',
          auth_token_endpoint: 'custom/token',
        },
      },
    };

    render(<GenericPKCEAuthenticationPage {...props} />);

    expect(PkceAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        base_url: 'https://cognito.example.com',
        app_id: 'app-id',
        auth_endpoint: 'custom/authorize',
        auth_token_endpoint: 'custom/token',
      }),
    );
  });

  describe('completeAuth callback', () => {
    it('sets loginError and does not call onLogin on error', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      let completeAuthCallback;
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: cb => {
          completeAuthCallback = cb;
        },
        authenticate: jest.fn(),
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<GenericPKCEAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        completeAuthCallback(new Error('boom'), null);
      });

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });

    it('calls onLogin with data on success', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      let completeAuthCallback;
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: cb => {
          completeAuthCallback = cb;
        },
        authenticate: jest.fn(),
      }));

      const onLogin = jest.fn();
      render(<GenericPKCEAuthenticationPage {...baseProps} onLogin={onLogin} />);

      const data = { token: 'abc' };
      completeAuthCallback(null, data);

      expect(onLogin).toHaveBeenCalledWith(data);
    });
  });

  describe('handleLogin', () => {
    it('prevents default form submission, sets loginError and does not call onLogin on error', () => {
      function authenticate(scope, cb) {
        cb(new Error('auth failed'), null);
      }
      const onLogin = jest.fn();

      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: jest.fn(),
        authenticate,
      }));

      const instanceRef = React.createRef();
      render(<GenericPKCEAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      const preventDefault = jest.fn();
      act(() => {
        instanceRef.current.handleLogin({ preventDefault });
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: auth failed');
    });

    it('calls onLogin with data on successful authenticate', () => {
      const data = { token: 'xyz' };
      function authenticate(scope, cb) {
        cb(null, data);
      }
      const onLogin = jest.fn();

      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: jest.fn(),
        authenticate,
      }));

      const instanceRef = React.createRef();
      render(<GenericPKCEAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      const preventDefault = jest.fn();
      instanceRef.current.handleLogin({ preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(onLogin).toHaveBeenCalledWith(data);
    });
  });
});
