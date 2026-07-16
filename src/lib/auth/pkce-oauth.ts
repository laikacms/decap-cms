import { trim, trimEnd } from 'lodash-es';

import { createNonce, validateNonce, isInsecureProtocol } from './utils';

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const sha: string = String.fromCharCode(...new Uint8Array(digest));
  return sha;
}

// based on https://github.com/auth0/auth0-spa-js/blob/9a83f698127eae7da72691b0d4b1b847567687e3/src/utils.ts#L147
function generateVerifierCode(): string {
  // characters that can be used for codeVerifier
  // excludes _~ as if included would cause an uneven distribution as char.length would no longer be a factor of 256
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.';
  const randomValues: number[] = Array.from(window.crypto.getRandomValues(new Uint8Array(128)));
  return randomValues
    .map((val: number): string => {
      return chars[val % chars.length];
    })
    .join('');
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const sha: string = await sha256(codeVerifier);
  // https://tools.ietf.org/html/rfc7636#appendix-A
  return btoa(sha).split('=')[0].replace(/\+/g, '-').replace(/\//g, '_');
}

const CODE_VERIFIER_STORAGE_KEY = 'decap-cms-pkce-verifier-code';

function createCodeVerifier(): string {
  const codeVerifier: string = generateVerifierCode();
  window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier);
  return codeVerifier;
}

function getCodeVerifier(): string | null {
  return window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
}

function clearCodeVerifier(): void {
  window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
}

export interface PkceAuthenticatorConfig {
  use_oidc?: boolean;
  base_url?: string;
  auth_endpoint?: string;
  auth_token_endpoint?: string;
  auth_token_endpoint_content_type?: string;
  app_id?: string;
}

export interface PkceAuthenticateOptions {
  scope: string;
}

export interface PkceAuthResult {
  token: string;
  access_token?: string;
  [key: string]: unknown;
}

export type PkceAuthCallback = (error: Error | null, data?: PkceAuthResult) => void;

interface OidcConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
}

interface StatePayload {
  auth_type: string;
  nonce: string;
}

interface TokenRequestBody {
  client_id: string | undefined;
  code: string | null;
  grant_type: string;
  redirect_uri: string;
  code_verifier: string | null;
}

interface TokenResponse {
  access_token: string;
  [key: string]: unknown;
}

export default class PkceAuthenticator {
  oidc_url?: string;
  auth_url?: string;
  auth_token_url?: string;
  auth_token_endpoint_content_type: string | undefined;
  appID: string | undefined;

  constructor(config: PkceAuthenticatorConfig = {}) {
    const useOidc: boolean | undefined = config.use_oidc;
    const baseURL: string = trimEnd(config.base_url, '/') || '';
    if (!baseURL) {
      throw new Error(
        "PkceAuthenticator: `base_url` is required (it is the provider's base URL, " +
          'e.g. `https://gitlab.com`); omitting it produces a relative auth URL that ' +
          'fails when passed to `new URL()`.',
      );
    }
    const authEndpoint: string = trim(config.auth_endpoint, '/') || '';
    const authTokenEndpoint: string = trim(config.auth_token_endpoint, '/') || '';
    if (useOidc) {
      // The code will try to auto-find the correct token/auth endpoints using OIDC standards
      this.oidc_url = baseURL;
    } else {
      this.auth_url = `${baseURL}/${authEndpoint}`;
      this.auth_token_url = `${baseURL}/${authTokenEndpoint}`;
    }
    this.auth_token_endpoint_content_type = config.auth_token_endpoint_content_type;
    this.appID = config.app_id;
  }

  async _loadOidcConfig(): Promise<void> {
    if (this.auth_url && this.auth_token_url) return;
    if (!this.oidc_url) throw new Error('Missing auth URLs');

    const response: Response = await fetch(
      `${this.oidc_url}/.well-known/openid-configuration`,
    ).catch(() => {
      throw new Error('Failed to load OIDC configuration');
    });
    if (!response.ok) {
      throw new Error('Bad response while getting OIDC configuration');
    }
    const json: OidcConfiguration = await response.json().catch(() => {
      throw new Error('Failed to parse OIDC configuration JSON');
    });
    if (!json.authorization_endpoint || !json.token_endpoint) {
      throw new Error('OIDC configuration missing endpoint fields');
    }
    this.auth_url = json.authorization_endpoint;
    this.auth_token_url = json.token_endpoint;
  }

  async authenticate(options: PkceAuthenticateOptions, cb: PkceAuthCallback): Promise<void> {
    if (isInsecureProtocol()) {
      return cb(new Error('Cannot authenticate over insecure protocol!'));
    }
    try {
      await this._loadOidcConfig();
    } catch (err: unknown) {
      return cb(err as Error);
    }

    const authURL = new URL(this.auth_url!);
    authURL.searchParams.set('client_id', this.appID || '');
    authURL.searchParams.set('redirect_uri', document.location.origin + document.location.pathname);
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('scope', options.scope);

    const state: string = JSON.stringify({ auth_type: 'pkce', nonce: createNonce() });

    authURL.searchParams.set('state', state);

    authURL.searchParams.set('code_challenge_method', 'S256');
    const codeVerifier: string = createCodeVerifier();
    const codeChallenge: string = await createCodeChallenge(codeVerifier);
    authURL.searchParams.set('code_challenge', codeChallenge);

    document.location.assign(authURL.href);
  }

  /**
   * Complete authentication if we were redirected back to from the provider.
   */
  async completeAuth(cb: PkceAuthCallback): Promise<void> {
    const params = new URLSearchParams(document.location.search);

    // Remove code from url
    window.history.replaceState(null, '', document.location.pathname);

    if (!params.has('code') && !params.has('error')) {
      return;
    }

    let nonce: string;
    const stateParam: string | null = params.get('state');
    if (!stateParam) {
      return cb(new Error('Missing state parameter'));
    }
    try {
      nonce = (JSON.parse(stateParam) as StatePayload).nonce;
    } catch {
      nonce = (JSON.parse(stateParam.replace(/\\"/g, '"')) as StatePayload).nonce;
    }

    const validNonce: boolean = validateNonce(nonce);
    if (!validNonce) {
      return cb(new Error('Invalid nonce'));
    }

    if (params.has('error')) {
      return cb(new Error(`${params.get('error')}: ${params.get('error_description')}`));
    }

    if (params.has('code')) {
      try {
        await this._loadOidcConfig();
      } catch (err: unknown) {
        return cb(err as Error);
      }

      const code: string | null = params.get('code');
      const authURL = new URL(this.auth_token_url!);

      const token_request_body_object: TokenRequestBody = {
        client_id: this.appID,
        code,
        grant_type: 'authorization_code',
        redirect_uri: document.location.origin + document.location.pathname,
        code_verifier: getCodeVerifier(),
      };

      const contentType: string = this.auth_token_endpoint_content_type || 'application/json';
      const response: Response = await fetch(authURL.href, {
        method: 'POST',
        body: contentType.startsWith('application/x-www-form-urlencoded')
          ? new URLSearchParams(
              Object.entries(token_request_body_object).filter(
                (entry): entry is [string, string] => entry[1] != null,
              ),
            ).toString()
          : JSON.stringify(token_request_body_object),
        headers: {
          'Content-Type': contentType,
        },
      });
      const data: TokenResponse = await response.json();

      //no need for verifier code so remove
      clearCodeVerifier();
      cb(null, { token: data.access_token, ...data });
    }
  }
}
