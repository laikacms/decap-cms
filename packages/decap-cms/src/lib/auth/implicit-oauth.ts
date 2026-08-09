import { trim, trimEnd } from 'lodash-es';

import { createNonce, isInsecureProtocol, validateNonce } from './utils';

// Every member is forwarded straight from `config.backend`, where an unset key
// reads as `undefined`, so absence is spelled as an explicit `undefined`.
export interface ImplicitAuthenticatorConfig {
  base_url?: string | undefined;
  auth_endpoint?: string | undefined;
  app_id?: string | undefined;
  clearHash?: (() => void) | undefined;
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

    const params = Object.fromEntries(hashParams.entries());

    const stateValue = params.state;
    if (!stateValue) {
      return cb(new Error('Missing state parameter'));
    }
    const { nonce } = JSON.parse(stateValue) as StatePayload;
    const validNonce: boolean = validateNonce(nonce);
    if (!validNonce) {
      return cb(new Error('Invalid nonce'));
    }

    if (params.error) {
      return cb(new Error(`${params.error}: ${params.error_description}`));
    }

    if (params.access_token) {
      const { access_token: token, ...data } = params;
      cb(null, { token, ...data });
    }
  }
}
