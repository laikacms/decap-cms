import React from 'react';
import { render, act } from '@testing-library/react';

import GitLabAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  NetlifyAuthenticator: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
  })),
  ImplicitAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
  PkceAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
}));

describe('GitLabAuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('componentDidMount auth_type dispatch', () => {
    it('constructs a PkceAuthenticator when auth_type is "pkce"', () => {
      const {
        PkceAuthenticator,
        NetlifyAuthenticator,
        ImplicitAuthenticator,
      } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: {
          backend: {
            auth_type: 'pkce',
            base_url: 'https://gitlab.example.com',
            auth_endpoint: 'custom/oauth/authorize',
            app_id: 'my-app-id',
          },
        },
      };

      render(<GitLabAuthenticationPage {...props} />);

      expect(PkceAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          base_url: 'https://gitlab.example.com',
          auth_endpoint: 'custom/oauth/authorize',
          app_id: 'my-app-id',
          auth_token_endpoint: 'oauth/token',
          auth_token_endpoint_content_type: 'application/json; charset=utf-8',
        }),
      );
      expect(NetlifyAuthenticator).not.toHaveBeenCalled();
      expect(ImplicitAuthenticator).not.toHaveBeenCalled();
    });

    it('calls onLogin when completeAuth succeeds for pkce auth', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      const authData = { token: 'abc' };
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: cb => cb(null, authData),
      }));

      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { auth_type: 'pkce' } },
      };

      render(<GitLabAuthenticationPage {...props} />);

      expect(onLogin).toHaveBeenCalledWith(authData);
    });

    it('sets loginError and does not call onLogin when completeAuth errors for pkce auth', () => {
      const { PkceAuthenticator } = require('decap-cms-lib-auth');
      PkceAuthenticator.mockImplementation(() => ({
        completeAuth: cb => cb(new Error('boom'), null),
      }));

      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { auth_type: 'pkce' } },
      };

      const instanceRef = React.createRef();
      render(<GitLabAuthenticationPage {...props} ref={instanceRef} />);

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });

    it('constructs an ImplicitAuthenticator when auth_type is "implicit"', () => {
      const {
        ImplicitAuthenticator,
        NetlifyAuthenticator,
        PkceAuthenticator,
      } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: {
          backend: {
            auth_type: 'implicit',
            base_url: 'https://gitlab.example.com',
            auth_endpoint: 'custom/oauth/authorize',
            app_id: 'my-app-id',
          },
        },
      };

      render(<GitLabAuthenticationPage {...props} />);

      expect(ImplicitAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          base_url: 'https://gitlab.example.com',
          auth_endpoint: 'custom/oauth/authorize',
          app_id: 'my-app-id',
        }),
      );
      expect(NetlifyAuthenticator).not.toHaveBeenCalled();
      expect(PkceAuthenticator).not.toHaveBeenCalled();
    });

    it('calls onLogin when completeAuth succeeds for implicit auth', () => {
      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      const authData = { token: 'abc' };
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: cb => cb(null, authData),
      }));

      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { auth_type: 'implicit' } },
      };

      render(<GitLabAuthenticationPage {...props} />);

      expect(onLogin).toHaveBeenCalledWith(authData);
    });

    it('sets loginError and does not call onLogin when completeAuth errors for implicit auth', () => {
      const { ImplicitAuthenticator } = require('decap-cms-lib-auth');
      ImplicitAuthenticator.mockImplementation(() => ({
        completeAuth: cb => cb(new Error('boom'), null),
      }));

      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        config: { backend: { auth_type: 'implicit' } },
      };

      const instanceRef = React.createRef();
      render(<GitLabAuthenticationPage {...props} ref={instanceRef} />);

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });

    it('falls back to a NetlifyAuthenticator when auth_type is unset', () => {
      const {
        NetlifyAuthenticator,
        ImplicitAuthenticator,
        PkceAuthenticator,
      } = require('decap-cms-lib-auth');

      render(<GitLabAuthenticationPage {...baseProps} />);

      expect(NetlifyAuthenticator).toHaveBeenCalledTimes(1);
      expect(ImplicitAuthenticator).not.toHaveBeenCalled();
      expect(PkceAuthenticator).not.toHaveBeenCalled();
    });

    it('falls back to a NetlifyAuthenticator for any unrecognized auth_type', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: { backend: { auth_type: 'not-a-real-type' } },
      };
      render(<GitLabAuthenticationPage {...props} />);

      expect(NetlifyAuthenticator).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleLogin', () => {
    it('calls onLogin with { provider: "gitlab", scope: "api" } on success', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      const authData = { token: 'abc' };
      let authenticateArgs;
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => {
          authenticateArgs = args;
          cb(null, authData);
        },
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<GitLabAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      instanceRef.current.handleLogin({ preventDefault: jest.fn() });

      expect(authenticateArgs).toEqual({ provider: 'gitlab', scope: 'api' });
      expect(onLogin).toHaveBeenCalledWith(authData);
    });

    it('sets loginError state and does not call onLogin when authenticate errors', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => cb(new Error('boom'), null),
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<GitLabAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });
  });
});
