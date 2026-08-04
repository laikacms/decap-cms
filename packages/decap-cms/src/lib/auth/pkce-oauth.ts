import { trim, trimEnd } from 'lodash-es';

import { createNonce, isInsecureProtocol, validateNonce } from './utils';

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
const RETURN_HASH_STORAGE_KEY = 'decap-cms-pkce-return-hash';

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
  /**
   * Exact redirect URI to send to the provider, instead of assuming the
   * current page URL. Cognito matches redirect URIs exactly, so a CMS mounted
   * on a per-project route (`/projects/:id/decap/embedded`) cannot use the
   * current URL - every project would need its own registered URI. Point this
   * at one fixed callback route and use `returnTo` to get back.
   */
  redirect_uri?: string;
  /**
   * Same-origin path to return to after the fixed callback route completes the
   * exchange. Carried in the OAuth `state` alongside the CSRF nonce.
   */
  return_to?: string;
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
  returnTo?: string;
}

/**
 * A `returnTo` must be a same-origin *path*, so the callback route can only
 * ever bounce back inside this app. Rejects absolute URLs, protocol-relative
 * `//host`, and the backslash variants browsers normalise to `//`.
 */
export function isSameOriginPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}

interface TokenRequestParams {
  client_id: string;
  grant_type: string;
  redirect_uri: string;
  code?: string | null;
  code_verifier?: string | null;
  refresh_token?: string;
}

interface TokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
}

export default class PkceAuthenticator {
  oidc_url?: string;
  auth_url?: string;
  auth_token_url?: string;
  auth_token_endpoint_content_type: string | undefined;
  appID: string;
  redirectUri: string | undefined;
  returnTo: string | undefined;

  constructor(config: PkceAuthenticatorConfig = {}) {
    const useOidc: boolean | undefined = config.use_oidc;
    const baseURL: string = trimEnd(config.base_url, '/') || '';
    if (!baseURL) {
      throw new Error(
        "PkceAuthenticator: `base_url` is required (it is the provider's base URL, "
          + 'e.g. `https://gitlab.com`); omitting it produces a relative auth URL that '
          + 'fails when passed to `new URL()`.',
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
    this.appID = config.app_id || '';
    this.redirectUri = config.redirect_uri;
    if (config.return_to !== undefined && !isSameOriginPath(config.return_to)) {
      throw new Error(
        'PkceAuthenticator: `return_to` must be a same-origin path beginning with a '
          + 'single "/" - an absolute or protocol-relative value would make the '
          + 'callback route an open redirect.',
      );
    }
    this.returnTo = config.return_to;
  }

  /**
   * The exact `redirect_uri` sent to the provider and replayed on the token
   * exchange. Defaults to the current page URL, which is what every non-embedded
   * backend wants; the embedded CMS overrides it with a fixed callback route.
   */
  private _redirectUri(): string {
    return this.redirectUri ?? document.location.origin + document.location.pathname;
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

  /**
   * Build the provider authorization URL, minting the CSRF nonce and the PKCE
   * verifier as a side effect. Separated from `authenticate` so the URL - and
   * therefore the redirect_uri and state contract - is assertable without
   * navigating, which jsdom cannot do.
   */
  async buildAuthorizationUrl(options: PkceAuthenticateOptions): Promise<URL> {
    const authURL = new URL(this.auth_url!);
    authURL.searchParams.set('client_id', this.appID);
    authURL.searchParams.set('redirect_uri', this._redirectUri());
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('scope', options.scope);

    const statePayload: StatePayload = { auth_type: 'pkce', nonce: createNonce() };
    if (this.returnTo !== undefined) {
      statePayload.returnTo = this.returnTo;
    }
    authURL.searchParams.set('state', JSON.stringify(statePayload));

    authURL.searchParams.set('code_challenge_method', 'S256');
    const codeVerifier: string = createCodeVerifier();
    authURL.searchParams.set('code_challenge', await createCodeChallenge(codeVerifier));
    return authURL;
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

    const authURL = await this.buildAuthorizationUrl(options);

    // The provider redirects back to a hash-less `redirect_uri`, so the hash
    // route the user is on right now would be lost. Stash it for
    // `completeAuth` to restore.
    if (document.location.hash) {
      window.sessionStorage.setItem(RETURN_HASH_STORAGE_KEY, document.location.hash);
    } else {
      window.sessionStorage.removeItem(RETURN_HASH_STORAGE_KEY);
    }

    document.location.assign(authURL.href);
  }

  /**
   * Complete authentication if we were redirected back to from the provider.
   */
  async completeAuth(cb: PkceAuthCallback): Promise<void> {
    const params = new URLSearchParams(document.location.search);

    // Only touch the URL when we actually returned from the provider. This
    // runs on every auth-page mount (i.e. every reload while a session is
    // being restored), and unconditionally rewriting the URL here used to
    // wipe the `#/...` route and the history state on every reload, breaking
    // deep links and shareable URLs.
    if (!params.has('code') && !params.has('error')) {
      return;
    }

    // The hash route the user was on before `authenticate()` redirected away,
    // falling back to whatever hash came back with the redirect.
    const returnHash = window.sessionStorage.getItem(RETURN_HASH_STORAGE_KEY)
      || document.location.hash;
    window.sessionStorage.removeItem(RETURN_HASH_STORAGE_KEY);

    // Scrub the one-time code/state params from the URL, keeping
    // `window.history.state` intact (the hash history stamps its entry index
    // there).
    window.history.replaceState(window.history.state, '', document.location.pathname);
    // Restore the pre-auth route via `location.replace` (not `replaceState`)
    // so the change fires `hashchange` and the router picks it up; a
    // hash-only replace does not reload the page.
    if (returnHash && returnHash !== '#' && returnHash !== window.location.hash) {
      window.location.replace(returnHash);
    }

    let state: StatePayload;
    const stateParam: string | null = params.get('state');
    if (!stateParam) {
      return cb(new Error('Missing state parameter'));
    }
    try {
      state = JSON.parse(stateParam) as StatePayload;
    } catch {
      try {
        state = JSON.parse(stateParam.replace(/\\"/g, '"')) as StatePayload;
      } catch {
        return cb(new Error('Invalid state parameter'));
      }
    }

    // A `returnTo` that is not a same-origin path is rejected before the nonce
    // is consumed, so a tampered state can never become a redirect target.
    if (state.returnTo !== undefined && !isSameOriginPath(state.returnTo)) {
      return cb(new Error('Invalid return path'));
    }

    // Single-use: validateNonce consumes the stored nonce, so a replayed
    // callback URL fails here rather than exchanging the code twice.
    const validNonce: boolean = validateNonce(state.nonce);
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

      let data: TokenResponse;
      try {
        data = await this._requestToken({
          client_id: this.appID,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this._redirectUri(),
          code_verifier: getCodeVerifier(),
        });
      } catch (err: unknown) {
        clearCodeVerifier();
        return cb(err as Error);
      }

      // no need for verifier code so remove
      clearCodeVerifier();
      cb(null, { token: data.access_token, ...data });
    }
  }

  /**
   * Exchange a refresh token for a new access token. Used to recover from an
   * expired PKCE access token without forcing the user to re-authenticate.
   * Returns the new credentials so callers can persist them.
   */
  async refresh({ refresh_token }: { refresh_token?: string }): Promise<PkceAuthResult> {
    if (!refresh_token) {
      throw new Error('Missing refresh token');
    }
    await this._loadOidcConfig();

    const data = await this._requestToken({
      client_id: this.appID,
      grant_type: 'refresh_token',
      redirect_uri: this._redirectUri(),
      refresh_token,
    });

    return { token: data.access_token, ...data };
  }

  async _requestToken(params: TokenRequestParams): Promise<TokenResponse> {
    const authURL = new URL(this.auth_token_url!);
    const contentType: string = this.auth_token_endpoint_content_type || 'application/json';
    const response: Response = await fetch(authURL.href, {
      method: 'POST',
      body: contentType.startsWith('application/x-www-form-urlencoded')
        ? new URLSearchParams(
          Object.entries(params).filter(
            (entry): entry is [string, string] => entry[1] != null,
          ),
        ).toString()
        : JSON.stringify(params),
      headers: {
        'Content-Type': contentType,
      },
    });
    const data: TokenResponse = await response.json();
    if (!response.ok || data.error) {
      throw new Error(
        data.error_description || data.error || `Failed to get token: ${response.status}`,
      );
    }
    return data;
  }
}
