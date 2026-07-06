import React from 'react';
import { render, act } from '@testing-library/react';

import AzureAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  ImplicitAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
}));

describe('AzureAuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs ImplicitAuthenticator with base_url from config.backend.tenant_id, auth_endpoint, app_id and clearHash', () => {
    const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
    const clearHash = jest.fn();

    const props = {
      ...baseProps,
      clearHash,
      config: { backend: { tenant_id: 'my-tenant', app_id: 'my-app-id' } },
    };

    render(<AzureAuthenticationPage {...props} />);

    expect(ImplicitAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({
        base_url: 'https://login.microsoftonline.com/my-tenant',
        auth_endpoint: 'oauth2/authorize',
        app_id: 'my-app-id',
        clearHash,
      }),
    );
  });

  describe('componentDidMount completeAuth callback', () => {
    it('calls onLogin with data on success', () => {
      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      let completeAuthCallback;
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: cb => {
          completeAuthCallback = cb;
        },
        authenticate: jest.fn(),
      }));

      const onLogin = jest.fn();
      render(<AzureAuthenticationPage {...baseProps} onLogin={onLogin} />);

      const data = { token: 'abc' };
      act(() => {
        completeAuthCallback(null, data);
      });

      expect(onLogin).toHaveBeenCalledWith(data);
    });

    it('alerts the error and does not call onLogin on failure', () => {
      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      let completeAuthCallback;
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: cb => {
          completeAuthCallback = cb;
        },
        authenticate: jest.fn(),
      }));

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const onLogin = jest.fn();
      const error = new Error('boom');
      render(<AzureAuthenticationPage {...baseProps} onLogin={onLogin} />);

      act(() => {
        completeAuthCallback(error);
      });

      expect(alertSpy).toHaveBeenCalledWith(error);
      expect(onLogin).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('handleLogin', () => {
    it('prevents default form submission and authenticates with the expected scope/resource/prompt', () => {
      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      let authenticateArgs;
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: jest.fn(),
        authenticate: args => {
          authenticateArgs = args;
        },
      }));

      const instanceRef = React.createRef();
      render(<AzureAuthenticationPage {...baseProps} ref={instanceRef} />);

      const preventDefault = jest.fn();
      act(() => {
        instanceRef.current.handleLogin({ preventDefault });
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(authenticateArgs).toEqual({
        scope: 'vso.code_full,user.read',
        resource: '499b84ac-1321-427f-aa17-267ca6975798',
        prompt: 'select_account',
      });
    });

    it('calls onLogin with data on successful authenticate', () => {
      const data = { token: 'xyz' };
      function authenticate(scope, cb) {
        cb(null, data);
      }
      const onLogin = jest.fn();

      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: jest.fn(),
        authenticate,
      }));

      const instanceRef = React.createRef();
      render(<AzureAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(onLogin).toHaveBeenCalledWith(data);
    });

    it('sets loginError and does not call onLogin on failure', () => {
      function authenticate(scope, cb) {
        cb(new Error('auth failed'), null);
      }
      const onLogin = jest.fn();

      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: jest.fn(),
        authenticate,
      }));

      const instanceRef = React.createRef();
      render(<AzureAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: auth failed');
    });
  });
});
