import { Map } from 'immutable';
import trim from 'lodash/trim';
import trimEnd from 'lodash/trimEnd';

import { createNonce, validateNonce, isInsecureProtocol } from './utils';

export interface ImplicitAuthenticatorConfig {
  base_url?: string;
  auth_endpoint?: string;
  app_id?: string;
  clearHash?: () => void;
}

export interface ImplicitAuthenticateOptions {
  scope: string;
  prompt?: string;
  resource?: string;
}

export interface ImplicitAuthResult {
  token: string;
  [key: string]: unknown;
}

export type ImplicitAuthCallback = (error: Error | null, data?: ImplicitAuthResult) => void;

interface StatePayload {
  auth_type: string;
  nonce: string;
}

export default class ImplicitAuthenticator {
  auth_url: string;
  appID: string | undefined;
  clearHash: (() => void) | undefined;

  constructor(config: ImplicitAuthenticatorConfig = {}) {
    const baseURL: string = trimEnd(config.base_url, '/') || '';
    const authEndpoint: string = trim(config.auth_endpoint, '/') || '';
    this.auth_url = `${baseURL}/${authEndpoint}`;
    this.appID = config.app_id;
    this.clearHash = config.clearHash;
  }

  authenticate(options: ImplicitAuthenticateOptions, cb: ImplicitAuthCallback): void {
    if (isInsecureProtocol()) {
      return cb(new Error('Cannot authenticate over insecure protocol!'));
    }

    const authURL = new URL(this.auth_url);
    authURL.searchParams.set('client_id', this.appID || '');
    authURL.searchParams.set('redirect_uri', document.location.origin + document.location.pathname);
    authURL.searchParams.set('response_type', 'token');
    authURL.searchParams.set('scope', options.scope);

    if (options.prompt != null && options.prompt != undefined) {
      authURL.searchParams.set('prompt', options.prompt);
    }

    if (options.resource != null && options.resource != undefined) {
      authURL.searchParams.set('resource', options.resource);
    }

    const state: string = JSON.stringify({ auth_type: 'implicit', nonce: createNonce() });

    authURL.searchParams.set('state', state);

    document.location.assign(authURL.href);
  }

  /**
   * Complete authentication if we were redirected back to from the provider.
   */
  completeAuth(cb: ImplicitAuthCallback): void {
    const hashParams = new URLSearchParams(document.location.hash.replace(/^#?\/?/, ''));
    if (!hashParams.has('access_token') && !hashParams.has('error')) {
      return;
    }
    // Remove tokens from hash so that token does not remain in browser history.
    this.clearHash?.();

    const params = Map<string, string>(hashParams.entries());

    const stateValue = params.get('state');
    if (!stateValue) {
      return cb(new Error('Missing state parameter'));
    }
    const { nonce } = JSON.parse(stateValue) as StatePayload;
    const validNonce: boolean = validateNonce(nonce);
    if (!validNonce) {
      return cb(new Error('Invalid nonce'));
    }

    if (params.has('error')) {
      return cb(new Error(`${params.get('error')}: ${params.get('error_description')}`));
    }

    if (params.has('access_token')) {
      const paramsObj = params.toJS() as Record<string, string>;
      const { access_token: token, ...data } = paramsObj;
      cb(null, { token, ...data });
    }
  }
}
