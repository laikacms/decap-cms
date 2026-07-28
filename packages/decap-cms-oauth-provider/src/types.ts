/**
 * Config accepted by {@link createGitHubOAuthHandler}. Every field is plain
 * data so platform adapters can build it from whatever environment-variable
 * mechanism their runtime exposes (Cloudflare `env`, `process.env`, `Deno.env`, ...).
 */
export interface GitHubOAuthConfig {
  /** GitHub OAuth App client ID. */
  clientId: string;
  /** GitHub OAuth App client secret. Never exposed to the browser. */
  clientSecret: string;
  /**
   * Secret used to HMAC-sign the stateless `state` param that round-trips
   * through GitHub. Rotating it invalidates any logins in flight.
   */
  stateSecret: string;
  /**
   * Origins allowed to complete the popup handshake, e.g. `https://cms.example.com`.
   * The incoming `/auth` request's `Referer` origin must be in this list.
   * Use `['*']` only for local development.
   */
  allowedOrigins: string[];
  /** Base path the handler is mounted at. Defaults to `/oauth`. */
  basePath?: string;
  /** OAuth scopes requested from GitHub. Defaults to `repo,user`. */
  scope?: string;
  /** Max age, in ms, a signed `state` value stays valid. Defaults to 10 minutes. */
  stateMaxAgeMs?: number;
  /** Override GitHub's authorize endpoint (GitHub Enterprise Server). */
  githubAuthorizeUrl?: string;
  /** Override GitHub's token endpoint (GitHub Enterprise Server). */
  githubTokenUrl?: string;
  /** Optional logger hook for server-side diagnostics. Never receives secrets. */
  logger?: { error: (message: string, error?: unknown) => void };
}

export interface OAuthHandler {
  /** WinterCG-style fetch handler: Request in, Response out. */
  fetch(request: Request): Promise<Response>;
}

export interface StatePayload {
  /** Nonce, unused beyond being part of the signed payload (defense in depth). */
  n: string;
  /** The validated origin the popup handshake will be completed against. */
  o: string;
  /** Issued-at, epoch ms. */
  t: number;
}
