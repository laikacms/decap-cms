/**
 * @laikacms/decap-cms-oauth-provider
 *
 * Edge-deployable OAuth callback/token-exchange handler for Decap CMS's
 * GitHub backend (DCMS-1413). A WinterCG `fetch(Request): Promise<Response>`
 * handler with no platform-specific globals, so it runs unmodified on
 * Cloudflare Workers, Vercel Edge, Netlify Edge, Deno, and plain Node 18+ -
 * see `./adapters/*` for the thin per-platform wrappers.
 *
 * Point the GitHub backend at it via `backend.base_url` /
 * `backend.auth_endpoint` in the CMS config, e.g.:
 *
 * ```yaml
 * backend:
 *   name: github
 *   repo: owner/repo
 *   base_url: https://my-oauth-worker.example.workers.dev
 *   auth_endpoint: oauth/auth
 * ```
 */
export { createGitHubOAuthHandler } from './handler';
export { exchangeCodeForToken, buildAuthorizeUrl, GitHubTokenExchangeError } from './github';
export { signState, verifyState, createNonce, InvalidStateError } from './state';
export type { GitHubOAuthConfig, OAuthHandler, StatePayload } from './types';
