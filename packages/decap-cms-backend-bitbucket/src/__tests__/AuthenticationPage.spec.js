import React from 'react';
import { render, act } from '@testing-library/react';

import BitbucketAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  NetlifyAuthenticator: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
  })),
  ImplicitAuthenticator: jest.fn().mockImplementation(() => ({
    completeAuth: jest.fn(),
    authenticate: jest.fn(),
  })),
}));

describe('BitbucketAuthenticationPage', () => {
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
    it('constructs an ImplicitAuthenticator when auth_type is "implicit"', () => {
      const { ImplicitAuthenticator, NetlifyAuthenticator } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: {
          backend: {
            auth_type: 'implicit',
            base_url: 'https://bitbucket.example.com',
            auth_endpoint: 'custom/oauth2/authorize',
            app_id: 'my-app-id',
          },
        },
      };

      render(<BitbucketAuthenticationPage {...props} />);

      expect(ImplicitAuthenticator).toHaveBeenCalledWith(
        expect.objectContaining({
          base_url: 'https://bitbucket.example.com',
          auth_endpoint: 'custom/oauth2/authorize',
          app_id: 'my-app-id',
        }),
      );
      expect(NetlifyAuthenticator).not.toHaveBeenCalled();
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

      render(<BitbucketAuthenticationPage {...props} />);

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
      render(<BitbucketAuthenticationPage {...props} ref={instanceRef} />);

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });

    it('constructs a NetlifyAuthenticator with authSettings scope "repo" when auth_type is unset', () => {
      const { NetlifyAuthenticator, ImplicitAuthenticator } = require('decap-cms-lib-auth');

      const instanceRef = React.createRef();
      render(<BitbucketAuthenticationPage {...baseProps} ref={instanceRef} />);

      expect(NetlifyAuthenticator).toHaveBeenCalledTimes(1);
      expect(ImplicitAuthenticator).not.toHaveBeenCalled();
      expect(instanceRef.current.authSettings).toEqual({ provider: 'bitbucket', scope: 'repo' });
    });

    it('constructs a NetlifyAuthenticator for any non-implicit auth_type', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');

      const props = {
        ...baseProps,
        config: { backend: { auth_type: 'pkce' } },
      };
      render(<BitbucketAuthenticationPage {...props} />);

      expect(NetlifyAuthenticator).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleLogin', () => {
    it('calls onLogin with the returned data on success', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      const authData = { token: 'abc' };
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => cb(null, authData),
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<BitbucketAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      instanceRef.current.handleLogin({ preventDefault: jest.fn() });

      expect(onLogin).toHaveBeenCalledWith(authData);
    });

    it('sets loginError state and does not call onLogin when authenticate errors', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => cb(new Error('boom'), null),
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<BitbucketAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });
  });
});
