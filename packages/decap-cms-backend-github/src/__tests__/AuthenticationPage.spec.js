import React from 'react';
import { render, act } from '@testing-library/react';

import GitHubAuthenticationPage from '../AuthenticationPage';

jest.mock('decap-cms-lib-auth', () => ({
  NetlifyAuthenticator: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
  })),
}));

describe('GitHubAuthenticationPage', () => {
  const baseProps = {
    config: { backend: {} },
    t: jest.fn(key => key),
    onLogin: jest.fn(),
    inProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLogin scope resolution', () => {
    it('uses scope "repo" by default (open_authoring false, no auth_scope)', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      let authenticateArgs;
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: args => {
          authenticateArgs = args;
        },
      }));

      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(authenticateArgs).toEqual({ provider: 'github', scope: 'repo' });
    });

    it('uses scope "public_repo" when open_authoring is true and no auth_scope is set', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      let authenticateArgs;
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: args => {
          authenticateArgs = args;
        },
      }));

      const props = {
        ...baseProps,
        config: { backend: { open_authoring: true } },
      };
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...props} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(authenticateArgs).toEqual({ provider: 'github', scope: 'public_repo' });
    });

    it('uses explicit auth_scope over the open_authoring-derived default', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      let authenticateArgs;
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: args => {
          authenticateArgs = args;
        },
      }));

      const props = {
        ...baseProps,
        config: { backend: { open_authoring: true, auth_scope: 'repo:status' } },
      };
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...props} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(authenticateArgs).toEqual({ provider: 'github', scope: 'repo:status' });
    });
  });

  describe('handleLogin auth errors', () => {
    it('sets loginError state and does not call onLogin when authenticate errors', () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => cb(new Error('boom'), null),
      }));

      const onLogin = jest.fn();
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} onLogin={onLogin} ref={instanceRef} />);

      act(() => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(onLogin).not.toHaveBeenCalled();
      expect(instanceRef.current.state.loginError).toBe('Error: boom');
    });
  });

  describe('open authoring fork state machine', () => {
    it('getPermissionToFork sets requestingFork true, and approveFork resolves + resets requestingFork to false', async () => {
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} ref={instanceRef} />);

      let promise;
      act(() => {
        promise = instanceRef.current.getPermissionToFork();
      });

      expect(instanceRef.current.state.requestingFork).toBe(true);

      act(() => {
        instanceRef.current.state.approveFork();
      });

      await expect(promise).resolves.toBeUndefined();
      expect(instanceRef.current.state.requestingFork).toBe(false);
    });

    it('getPermissionToFork rejects when refuseFork is called, and resets requestingFork to false', async () => {
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} ref={instanceRef} />);

      let promise;
      act(() => {
        promise = instanceRef.current.getPermissionToFork();
      });
      // Prevent unhandled rejection warnings before we assert on it below.
      promise.catch(() => {});

      expect(instanceRef.current.state.requestingFork).toBe(true);

      act(() => {
        instanceRef.current.state.refuseFork();
      });

      await expect(promise).rejects.toBeUndefined();
      expect(instanceRef.current.state.requestingFork).toBe(false);
    });

    it('drives loginWithOpenAuthoring via backend.authenticateWithFork and calls onLogin on success', async () => {
      const { NetlifyAuthenticator } = require('decap-cms-lib-auth');
      const authData = { token: 'abc' };
      NetlifyAuthenticator.mockImplementation(() => ({
        authenticate: (args, cb) => cb(null, authData),
      }));

      const authenticateWithFork = jest.fn().mockResolvedValue(undefined);
      const onLogin = jest.fn();
      const props = {
        ...baseProps,
        onLogin,
        backend: { authenticateWithFork },
        config: { backend: { open_authoring: true } },
      };
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...props} ref={instanceRef} />);

      await act(async () => {
        instanceRef.current.handleLogin({ preventDefault: jest.fn() });
      });

      expect(authenticateWithFork).toHaveBeenCalledWith(
        expect.objectContaining({
          userData: authData,
          getPermissionToFork: instanceRef.current.getPermissionToFork,
        }),
      );
      expect(onLogin).toHaveBeenCalledWith(authData);
    });

    it('sets findingFork state and surfaces the error when authenticateWithFork rejects', async () => {
      const authData = { token: 'abc' };
      const forkError = new Error('fork failed');
      const authenticateWithFork = jest.fn().mockRejectedValue(forkError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const props = {
        ...baseProps,
        backend: { authenticateWithFork },
      };
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...props} ref={instanceRef} />);

      let result;
      await act(async () => {
        result = instanceRef.current.loginWithOpenAuthoring(authData);
        await expect(result).rejects.toBe(forkError);
      });

      expect(instanceRef.current.state.findingFork).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(forkError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAuthenticationPageRenderArgs', () => {
    it('renders the fork-approval UI when requestingFork is true', () => {
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} ref={instanceRef} />);

      act(() => {
        instanceRef.current.setState({
          requestingFork: true,
          approveFork: jest.fn(),
          refuseFork: jest.fn(),
        });
      });

      const args = instanceRef.current.getAuthenticationPageRenderArgs();
      expect(args.renderPageContent).toBeDefined();
      expect(args.renderButtonContent).toBeUndefined();
    });

    it('renders the normal login button when requestingFork is falsy', () => {
      const instanceRef = React.createRef();
      render(<GitHubAuthenticationPage {...baseProps} ref={instanceRef} />);

      const args = instanceRef.current.getAuthenticationPageRenderArgs();
      expect(args.renderButtonContent).toBeDefined();
      expect(args.renderPageContent).toBeUndefined();
    });
  });
});
