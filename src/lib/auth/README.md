# `src/lib/auth/` — client-side authenticators

This directory implements the OAuth/OIDC flows the CMS runs directly in the
browser (as opposed to `src/backends/git-gateway/`, which proxies auth
through a server). Each authenticator is a small class with an
`authenticate()` / `completeAuth()` pair:

- `netlify-auth.ts` — `NetlifyAuthenticator`, drives Netlify's hosted OAuth
  provider (popup + `postMessage`).
- `implicit-oauth.ts` — `ImplicitAuthenticator`, the OAuth2 implicit grant
  (token returned in the URL fragment).
- `pkce-oauth.ts` — `PkceAuthenticator`, OAuth2 Authorization Code + PKCE
  (RFC 7636).

Backends select an authenticator via their `auth_type` config key and
construct it with the corresponding `*AuthenticatorConfig` type exported
from [`index.ts`](./index.ts).

## `PkceAuthenticatorConfig`

Used by backends that authenticate via OAuth2 Authorization Code + PKCE:

- **`gitea`** — always uses PKCE (`src/backends/gitea/AuthenticationPage.tsx`).
- **`gitlab`** — uses PKCE only when `backend.auth_type: pkce` is set;
  otherwise it falls back to Netlify-proxied implicit auth
  (`src/backends/gitlab/AuthenticationPage.tsx`).
- **`aws-cognito-github-proxy`** — always uses PKCE
  (`src/backends/aws-cognito-github-proxy/AuthenticationPage.tsx`).

`bitbucket`'s `AuthenticationPage.tsx` shares the `auth_endpoint`/`app_id`
config shape but currently wires up `implicit`/Netlify auth, not PKCE —
don't use it as a PKCE example.

```yaml
backend:
  name: gitea
  auth_type: pkce
  base_url: https://try.gitea.io
  app_id: your-oauth-app-client-id
```

Config keys (source: `PkceAuthenticatorConfig` in `pkce-oauth.ts`):

- **`app_id`** (optional) — the OAuth application's client ID, sent as
  `client_id` in both the authorization redirect and the token exchange
  request. Defaults to `''` (an empty client ID) if omitted, which will
  fail against any real OAuth provider — set it in practice.
- **`base_url`** (required) — the provider's base URL, e.g.
  `https://gitlab.com` or `https://try.gitea.io`. Combined with
  `auth_endpoint`/`auth_token_endpoint` to build the full authorization and
  token URLs (`${base_url}/${auth_endpoint}`), unless `use_oidc` is set (see
  below), in which case it's the base URL used for OIDC discovery instead.
  There's no sane absolute default to fall back to (it's an arbitrary
  provider domain, not derivable from any other config key), so the
  constructor throws immediately if it's omitted or empty, rather than
  building a relative URL that fails later with a confusing `Invalid URL`
  error from `new URL()`.
- **`auth_endpoint`** (optional) — path (relative to `base_url`) of the
  provider's authorization endpoint, e.g. `oauth/authorize` or
  `login/oauth/authorize`. Ignored when `use_oidc` is true.
- **`auth_token_endpoint`** (optional) — path (relative to `base_url`) of
  the provider's token endpoint, e.g. `oauth/token` or
  `login/oauth/access_token`. Ignored when `use_oidc` is true.
- **`auth_token_endpoint_content_type`** (optional) — `Content-Type` header
  sent with the token exchange `POST` request. Defaults to
  `application/json`. When the value starts with
  `application/x-www-form-urlencoded`, the request body is form-encoded
  (`URLSearchParams`) instead of JSON — required by providers whose token
  endpoint doesn't accept JSON bodies.
- **`use_oidc`** (optional, default `false`) — when `true`, skip
  `auth_endpoint`/`auth_token_endpoint` entirely and instead discover them
  from the provider's OpenID Connect discovery document at
  `${base_url}/.well-known/openid-configuration`
  (`authorization_endpoint` / `token_endpoint` fields). Useful for
  providers that support OIDC discovery instead of requiring the endpoint
  paths to be hardcoded in config.

## Flow

1. `authenticate({ scope })` builds the authorization URL (`client_id`,
   `redirect_uri`, `response_type=code`, `scope`, a nonce-bearing `state`,
   and a PKCE `code_challenge`/`code_challenge_method=S256` pair) and
   navigates the browser to it. The PKCE code verifier is stashed in
   `sessionStorage` for the return trip.
2. The provider redirects back with a `code` (and the original `state`) in
   the query string. `completeAuth(cb)` validates the `state` nonce,
   exchanges the `code` (plus the stashed code verifier) for a token at the
   token endpoint, and calls `cb(null, { token, ...rawResponse })`.
