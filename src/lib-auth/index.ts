import NetlifyAuthenticator from './netlify-auth';
import ImplicitAuthenticator from './implicit-oauth';
import PkceAuthenticator from './pkce-oauth';

// Re-export types from implicit-oauth
export type {
  ImplicitAuthenticatorConfig,
  ImplicitAuthenticateOptions,
  ImplicitAuthResult,
  ImplicitAuthCallback,
} from './implicit-oauth';

// Re-export types from netlify-auth
export type {
  NetlifyErrorPayload,
  NetlifyAuthenticatorConfig,
  NetlifyAuthenticateOptions,
  NetlifyRefreshOptions,
  NetlifyAuthResult,
  NetlifyAuthCallback,
  NetlifyRefreshCallback,
} from './netlify-auth';
export { NetlifyError } from './netlify-auth';

// Re-export types from pkce-oauth
export type {
  PkceAuthenticatorConfig,
  PkceAuthenticateOptions,
  PkceAuthResult,
  PkceAuthCallback,
} from './pkce-oauth';

export const DecapCmsLibAuth = { NetlifyAuthenticator, ImplicitAuthenticator, PkceAuthenticator };
export { NetlifyAuthenticator, ImplicitAuthenticator, PkceAuthenticator };
