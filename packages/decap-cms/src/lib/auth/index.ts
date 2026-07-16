import ImplicitAuthenticator from './implicit-oauth';
import NetlifyAuthenticator from './netlify-auth';
import PkceAuthenticator from './pkce-oauth';

// Re-export types from implicit-oauth
export type {
  ImplicitAuthCallback,
  ImplicitAuthenticateOptions,
  ImplicitAuthenticatorConfig,
  ImplicitAuthResult,
} from './implicit-oauth';

// Re-export types from netlify-auth
export type {
  NetlifyAuthCallback,
  NetlifyAuthenticateOptions,
  NetlifyAuthenticatorConfig,
  NetlifyAuthResult,
  NetlifyErrorPayload,
  NetlifyRefreshCallback,
  NetlifyRefreshOptions,
} from './netlify-auth';
export { NetlifyError } from './netlify-auth';

// Re-export types from pkce-oauth
export type { PkceAuthCallback, PkceAuthenticateOptions, PkceAuthenticatorConfig, PkceAuthResult } from './pkce-oauth';

export const DecapCmsLibAuth = { NetlifyAuthenticator, ImplicitAuthenticator, PkceAuthenticator };
export { ImplicitAuthenticator, NetlifyAuthenticator, PkceAuthenticator };
