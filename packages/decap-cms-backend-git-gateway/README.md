# Git Gateway

Netlify's [gateway](https://github.com/netlify/git-gateway) to hosted git APIs.

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md) based on `Api`.

`Api` and `Implementation` from backend-[github](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-github/README.md)/[gitlab](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-gitlab/README.md)/[bitbacket](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-bitbacket/README.md) extended with Netlify-specific `LargeMedia(LFS)` and `JWT` auth.

`AuthenticationPage` - uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md) and implements Netlify Identity authentication flow.

`PKCEAuthenticationPage` = uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md) and implements OAuth2 PKCE authentication flow. Enabled if the config.auth_type is set to `pkce`.

Look at tests or types for more info.

## Debugging

When debugging the CMS with Git Gateway you must:

1. Have a Netlify site with [Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/) and [Netlify Identity](https://docs.netlify.com/visitor-access/identity/) enabled. An easy way to create such a site is to use a [template](https://www.decapcms.org/docs/start-with-a-template/), for example the [Gatsby template](https://app.netlify.com/start/deploy?repository=https://github.com/decaporg/gatsby-starter-decap-cms&stack=cms)
2. Tell the CMS the URL of your Netlify site using a local storage item. To do so:

    1. Open `http://localhost:8080/` in the browser
    2. Write the below command and press enter: `localStorage.setItem('netlifySiteURL', 'https://yourwebsiteurl.netlify.app/')`
    3. To be sure, you can run this command as well: `localStorage.getItem('netlifySiteURL')`
    4. Refresh the page
    5. You should be able to log in via your Netlify Identity email/password

## PKCE with custom Git-Gateway

To use a custom Git-Gateway implementation with PKCE authentication, use a configuration similar to the following:

    backend:
        name: git-gateway
        # Enables PKCE authentication with the git-gateway backend. After auth,
        # sends the access_token for all requests to the git-gateway host.
        auth_type: pkce
        # The base OAuth2 URL. Here is an obfuscated AWS Cognito example.
        base_url: https://your-cognito-instance.auth.us-east-1.amazoncognito.com
        # If you need to customize the authorize or token endpoints for PKCE, do that here
        #auth_endpoint: oauth2/authorize
        #auth_token_endpoint: oauth2/token
        # The OAuth2 client ID
        app_id: your-oauth2-client-id
        # The base URL of your custom git-gateway. Note that the last part of the path
        # should be "bitbucket", "gitlab", or "github", so the implementation can automatically
        # determine which backend API to use when making requests.
        gateway_url: https://your.gitgateway.host/git-gateway/bitbucket/
        # Override the Netlify git-gateway status check
        status_endpoint: https://your.gitgateway.host/api/v2/components.json
        # Optional: component name to match in the status API response (default: "Git Gateway")
        status_component_name: My Git Gateway
        # Optional: URL of the status page shown to users when the service is down.
        # Defaults to the origin of status_endpoint when set, otherwise https://www.netlifystatus.com
        status_page: https://your.gitgateway.host/status
        # Optional: defaults to "master"
        branch: main

## Top-level `auth:` block (PKCE)

When `auth_type: pkce` is set, a top-level `auth:` block can be used to configure PKCE authentication independently of the `backend:` block. Keys in `auth:` take **priority** over the corresponding keys in `backend:` when both are present.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `use_oidc` | boolean | `false` | When `true`, fetches OAuth2 server metadata from `{base_url}/.well-known/openid-configuration` and uses the discovered endpoints automatically. |
| `base_url` | string | `backend.base_url` | Base URL of the OAuth2 / OIDC provider. Overrides `backend.base_url`. |
| `auth_endpoint` | string | `oauth2/authorize` | Path (relative to `base_url`) for the authorization endpoint. Overrides `backend.auth_endpoint`. |
| `auth_token_endpoint` | string | `oauth2/token` | Path (relative to `base_url`) for the token endpoint. Overrides `backend.auth_token_endpoint`. |
| `app_id` | string | `backend.app_id` | OAuth2 client ID. Overrides `backend.app_id`. |
| `scope` | string | `openid email` | Space-separated OAuth2 scopes requested during authorization. |
| `auth_token_endpoint_content_type` | string | `application/x-www-form-urlencoded; charset=utf-8` | `Content-Type` header sent when exchanging the authorization code for tokens. Also controls body serialization: values starting with `application/x-www-form-urlencoded` serialize the body as URL-encoded form data; any other value (e.g. `application/json`) serializes the body as JSON. Use `application/json` for providers such as AWS Cognito that require a JSON request body. |
| `email_claim` | string | `email` | JWT claim to use as the user's email address. |
| `full_name_claim` | string | — | JWT claim to use as the user's full name. Takes precedence over `first_name_claim` / `last_name_claim`. |
| `first_name_claim` | string | — | JWT claim for the user's first name (combined with `last_name_claim` when `full_name_claim` is absent). |
| `last_name_claim` | string | — | JWT claim for the user's last name. |
| `avatar_url_claim` | string | — | JWT claim for the user's avatar URL. |

### Example

    backend:
        name: git-gateway
        auth_type: pkce
        gateway_url: https://your.gitgateway.host/git-gateway/github/
        branch: main

    auth:
        use_oidc: true
        base_url: https://your-idp.example.com
        app_id: your-oauth2-client-id
        scope: openid email profile
        email_claim: email
        full_name_claim: name
        avatar_url_claim: picture

### OIDC endpoint discovery (`use_oidc: true`)

When `use_oidc: true` is set, the PKCE authenticator **ignores** `auth_endpoint` and `auth_token_endpoint` entirely. Instead, it performs OIDC Discovery by fetching:

    GET {base_url}/.well-known/openid-configuration

The JSON response must contain the standard fields:

| Field | Used as |
|-------|---------|
| `authorization_endpoint` | Authorization redirect URL |
| `token_endpoint` | Token exchange URL |

If the discovery request fails, returns a non-2xx status, returns non-JSON, or is missing either endpoint field, authentication is aborted with an error.

Use `use_oidc: true` with any standards-compliant OIDC provider (Keycloak, Auth0, AWS Cognito, etc.) so you don't need to hard-code provider-specific endpoint paths.
