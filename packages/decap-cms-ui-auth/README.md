# decap-cms-ui-auth

Authentication UI pages used by the decap-cms-backend-* packages.

## Common Behavior

* An authenticator must return the following fields:
  * email
  * token?

## Components

* **NetlifyAuthenticationPage**
    * Username and password fields that are passed to Netlify Identity.
    * Requires a static `authClient` value set before login will work, expected to be set by the backend implementation.
  * Returns object that satisfies the GitGatewayUser type (and inherited Credentials type) from Netlify
* **PKCEAuthenticationPage**
    * OAuth2 PKCE flow with optional OIDC auto-configuration.
    * Returns object that satisfies the GitGatewayUser type (and inherited Credentials type), with additional data:
        * token (part of Credentials definition): the access token
        * idToken: if available
        * claims: if available (decoded access token)
        * idClaims: if available (decoded ID token)
        * email: mapped email value from the token claims, if available
        * user_metadata.full_name: mapped value from the token claims, if available
        * user_metadata.avatar_url: mapped value from the token claims, if available
    * Configured via the top-level `auth:` block (see below). Backend implementations that
      render this page (e.g. `decap-cms-backend-aws-cognito-github-proxy`,
      `decap-cms-backend-git-gateway`) pass their own `config.auth` through unchanged.

## `auth:` config keys (PKCEAuthenticationPage)

`PKCEAuthenticationPage` reads the following keys from the top-level `auth:` block of the CMS
config. All are optional.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `use_oidc` | boolean | `false` | When `true`, fetches OAuth2 server metadata from `{base_url}/.well-known/openid-configuration` and uses the discovered endpoints automatically instead of `auth_endpoint` / `auth_token_endpoint`. |
| `base_url` | string | `backend.base_url` | Base URL of the OAuth2 / OIDC provider. |
| `app_id` | string | `backend.app_id` | OAuth2 client ID. |
| `auth_endpoint` | string | `backend.auth_endpoint` or `oauth2/authorize` | Path (relative to `base_url`) for the authorization endpoint. Ignored when `use_oidc: true`. |
| `auth_token_endpoint` | string | `backend.auth_token_endpoint` or `oauth2/token` | Path (relative to `base_url`) for the token endpoint. Ignored when `use_oidc: true`. |
| `auth_token_endpoint_content_type` | string | `application/x-www-form-urlencoded; charset=utf-8` | `Content-Type` header sent when exchanging the authorization code for tokens. Values starting with `application/x-www-form-urlencoded` serialize the body as URL-encoded form data; any other value (e.g. `application/json`) serializes the body as JSON. Use `application/json` for providers such as AWS Cognito that require a JSON request body. |
| `scope` | string | `openid email` | Space-separated OAuth2 scopes requested during authorization. |
| `email_claim` | string | `email` | JWT claim (from the access token or ID token) used as the returned `email`. |
| `full_name_claim` | string | — | JWT claim used as `user_metadata.full_name`. Takes precedence over `first_name_claim` / `last_name_claim`. |
| `first_name_claim` | string | — | JWT claim for the user's first name (combined with `last_name_claim` when `full_name_claim` is absent). |
| `last_name_claim` | string | — | JWT claim for the user's last name. |
| `avatar_url_claim` | string | — | JWT claim used as `user_metadata.avatar_url`. |

`base_url`, `app_id`, `auth_endpoint`, and `auth_token_endpoint` fall back to the same-named keys
under `backend:` when not set in `auth:`; keys in `auth:` take priority.

For a fuller worked example (including `use_oidc: true` with an external OIDC provider), see the
["Top-level `auth:` block (PKCE)"](../decap-cms-backend-git-gateway/README.md#top-level-auth-block-pkce)
section of the `decap-cms-backend-git-gateway` README — the same `auth:` keys apply to any backend
that renders `PKCEAuthenticationPage`, including `decap-cms-backend-aws-cognito-github-proxy`.

