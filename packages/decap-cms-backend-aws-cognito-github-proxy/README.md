# GitHub backend

An abstraction layer between the CMS and a proxied version of [Github](https://docs.github.com/en/rest).

## Code structure

`Implementation` - wraps [Github Backend](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-github/README.md) for a proxied version of GitHub, and provides `authComponent()`.

`authComponent()` - returns the [`PKCEAuthenticationPage`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-ui-auth/README.md) component from `decap-cms-ui-auth`, which uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md)'s `PkceAuthenticator` to create an AWS Cognito compatible generic Authentication page supporting PKCE.

## Configuration

This backend does not introduce its own config keys. PKCE and claim-mapping are configured via the
top-level `auth:` block, which is read directly by `PKCEAuthenticationPage`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `use_oidc` | boolean | `false` | When `true`, discovers the AWS Cognito OAuth2 endpoints from `{base_url}/.well-known/openid-configuration` instead of `auth_endpoint` / `auth_token_endpoint`. |
| `base_url` | string | `backend.base_url` | Base URL of the Cognito user pool domain, e.g. `https://your-pool.auth.us-east-1.amazoncognito.com`. |
| `app_id` | string | `backend.app_id` | Cognito app client ID. |
| `auth_endpoint` | string | `oauth2/authorize` | Authorization endpoint path, relative to `base_url`. Ignored when `use_oidc: true`. |
| `auth_token_endpoint` | string | `oauth2/token` | Token endpoint path, relative to `base_url`. Ignored when `use_oidc: true`. |
| `auth_token_endpoint_content_type` | string | `application/x-www-form-urlencoded; charset=utf-8` | Set to `application/json` for Cognito, which requires a JSON body on the token exchange request. |
| `scope` | string | `openid email` | Space-separated OAuth2 scopes requested during authorization. |
| `email_claim` | string | `email` | JWT claim used as the returned `email`. |
| `full_name_claim` | string | — | JWT claim used as `user_metadata.full_name`. Takes precedence over `first_name_claim` / `last_name_claim`. |
| `first_name_claim` | string | — | JWT claim for the user's first name (combined with `last_name_claim` when `full_name_claim` is absent). |
| `last_name_claim` | string | — | JWT claim for the user's last name. |
| `avatar_url_claim` | string | — | JWT claim used as `user_metadata.avatar_url`. |

See the [`decap-cms-ui-auth` README](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-ui-auth/README.md#auth-config-keys-pkceauthenticationpage)
for the full key reference, or the
[git-gateway README's `auth:` example](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-git-gateway/README.md#top-level-auth-block-pkce)
for a worked config sample (the same keys apply here).

Example:

    backend:
        name: aws-cognito-github-proxy
        base_url: https://your-cognito-instance.auth.us-east-1.amazoncognito.com
        app_id: your-cognito-app-client-id

    auth:
        auth_token_endpoint_content_type: application/json
        scope: openid email profile
        email_claim: email
        full_name_claim: name
