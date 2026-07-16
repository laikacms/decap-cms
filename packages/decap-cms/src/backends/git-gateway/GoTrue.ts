import { jwtDecode } from 'jwt-decode';

/**
 * Minimal replacement for the `gotrue-js` package, covering only the surface
 * the git-gateway backend uses: password login, session recovery from
 * localStorage, JWT retrieval with automatic refresh, and logout.
 *
 * Sessions are persisted under the same `gotrue.user` localStorage key and in
 * the same shape as `gotrue-js`, so sessions created before this replacement
 * keep working.
 */

const STORAGE_KEY = 'gotrue.user';
// Refresh the access token this long before it actually expires.
const EXPIRY_MARGIN = 60_000;

type TokenDetails = {
  access_token: string,
  refresh_token: string,
  token_type?: string,
  expires_in?: number,
  expires_at?: number,
};

export class GoTrueError extends Error {
  status: number;
  json: unknown;
  description: string;
  msg?: string;

  constructor(status: number, body: unknown) {
    const details = (typeof body === 'object' && body !== null ? body : {}) as Record<
      string,
      unknown
    >;
    const description = String(
      details.error_description
        || details.msg
        || details.error
        || (typeof body === 'string' && body)
        || `GoTrue request failed with status ${status}`,
    );
    super(description);
    this.name = 'GoTrueError';
    this.status = status;
    this.json = body;
    this.description = description;
    if (typeof details.msg === 'string') {
      this.msg = details.msg;
    }
  }
}

// Attributes managed by the client itself; never copied from stored user data.
const RESERVED_ATTRIBUTES = new Set(['token', 'url']);

export class GoTrueUser {
  url: string;
  token: TokenDetails;
  id?: string;
  email = '';
  user_metadata: { full_name?: string, avatar_url?: string } & Record<string, unknown> = {};
  app_metadata: Record<string, unknown> = {};

  private _client: GoTrue;
  private _refreshPromise: Promise<string> | null = null;

  constructor(client: GoTrue, tokenResponse: TokenDetails, attributes: Record<string, unknown>) {
    this._client = client;
    this.url = client.apiUrl;
    this.token = { access_token: '', refresh_token: '' };
    this._processTokenResponse(tokenResponse);
    for (const [key, value] of Object.entries(attributes)) {
      if (RESERVED_ATTRIBUTES.has(key) || key.startsWith('_') || typeof value === 'function') {
        continue;
      }
      (this as Record<string, unknown>)[key] = value;
    }
  }

  jwt(forceRefresh = false): Promise<string> {
    const { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt } = this.token;
    if (!accessToken) {
      return Promise.reject(new Error('Cannot get a JWT: the user has no token'));
    }
    if (forceRefresh || !expiresAt || expiresAt - EXPIRY_MARGIN < Date.now()) {
      return this._refreshToken(refreshToken);
    }
    return Promise.resolve(accessToken);
  }

  // Never rejects: the local session is cleared even when the API call fails.
  async logout(): Promise<void> {
    try {
      const token = await this.jwt();
      await this._client.request('/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e: unknown) {
      console.warn('Failed logging out of GoTrue', e);
    } finally {
      this.clearSession();
    }
  }

  saveSession() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this));
    return this;
  }

  clearSession() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  toJSON() {
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_')) {
        copy[key] = (this as Record<string, unknown>)[key];
      }
    }
    return copy;
  }

  private _processTokenResponse(tokenResponse: TokenDetails) {
    this.token = { ...tokenResponse };
    try {
      const claims = jwtDecode<{ exp?: number }>(tokenResponse.access_token);
      if (claims.exp) {
        this.token.expires_at = claims.exp * 1000;
      }
    } catch (e: unknown) {
      console.warn('Failed to parse GoTrue access token claims', e);
    }
  }

  // GoTrue rotates refresh tokens on use, so concurrent jwt() calls must
  // share a single in-flight refresh request.
  private _refreshToken(refreshToken: string): Promise<string> {
    if (!this._refreshPromise) {
      this._refreshPromise = this._client
        .requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
        .then(tokenResponse => {
          this._refreshPromise = null;
          this._processTokenResponse(tokenResponse);
          if (window.localStorage.getItem(STORAGE_KEY)) {
            this.saveSession();
          }
          return this.token.access_token;
        })
        .catch(error => {
          this._refreshPromise = null;
          this.clearSession();
          throw error;
        });
    }
    return this._refreshPromise;
  }
}

export default class GoTrue {
  apiUrl: string;

  constructor({ APIUrl }: { APIUrl: string }) {
    this.apiUrl = APIUrl.replace(/\/+$/, '');
  }

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}${path}`, options);
    const contentType = response.headers.get('Content-Type') || '';
    const body = contentType.includes('json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new GoTrueError(response.status, body);
    }
    return body;
  }

  requestToken(params: Record<string, string>): Promise<TokenDetails> {
    return this.request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    }) as Promise<TokenDetails>;
  }

  async login(email: string, password: string, remember = false): Promise<GoTrueUser> {
    window.localStorage.removeItem(STORAGE_KEY);
    const tokenResponse = await this.requestToken({
      grant_type: 'password',
      username: email,
      password,
    });
    const userData = (await this.request('/user', {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
    })) as Record<string, unknown>;
    const user = new GoTrueUser(this, tokenResponse, userData);
    if (remember) {
      user.saveSession();
    }
    return user;
  }

  currentUser(): GoTrueUser | null {
    const json = window.localStorage.getItem(STORAGE_KEY);
    if (!json) {
      return null;
    }
    try {
      const data = JSON.parse(json) as Record<string, unknown>;
      const token = data.token as TokenDetails | undefined;
      if (!token?.access_token || !token.refresh_token) {
        return null;
      }
      return new GoTrueUser(this, token, data);
    } catch {
      return null;
    }
  }
}
