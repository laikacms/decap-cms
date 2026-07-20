# AWS Cognito GitHub proxy backend

A `GitHubBackend` subclass that authenticates via an OAuth2/PKCE flow against an AWS Cognito (or
compatible) authorization server instead of GitHub's own OAuth app flow, while still reading and
writing content through the GitHub API.

## Code structure

`implementation.tsx` - `AwsCognitoGitHubProxyBackend` extends `GitHubBackend`. It forces
`bypassWriteAccessCheckForAppTokens = true` and `tokenKeyword = 'Bearer'` (not configurable), swaps
in the PKCE authentication page, and overrides `currentUser()` to fetch the user profile from
`${baseUrl}/oauth2/userInfo` using the Cognito access token instead of GitHub's `/user` endpoint.

`AuthenticationPage.tsx` - Wraps `usePkceAuth` to drive the PKCE login flow against the configured
Cognito endpoints and constructs a `PkceAuthenticator`.

Since this backend extends `GitHubBackend`, it also inherits all of the GitHub backend's own
`backend:` config keys (`repo`, `branch`, `api_root`, etc.) for reading/writing repository content

- see the GitHub backend's own docs for those.

## `backend:` config keys

| Key                   | Type   | Default              | Description                                                                                                                                               |
| --------------------- | ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base_url`            | string | `''`                 | Base URL of the Cognito (or compatible) authorization server used for the PKCE login flow and for `currentUser()`'s `${base_url}/oauth2/userInfo` lookup. |
| `app_id`              | string | `''`                 | OAuth2/PKCE client ID registered with the authorization server.                                                                                           |
| `auth_endpoint`       | string | `'oauth2/authorize'` | Path (relative to `base_url`) of the authorization endpoint used to start the PKCE flow.                                                                  |
| `auth_token_endpoint` | string | `'oauth2/token'`     | Path (relative to `base_url`) of the token endpoint used to exchange the PKCE authorization code for an access token.                                     |

The token exchange request is sent as `application/x-www-form-urlencoded; charset=utf-8`, and login
requests the scope `https://api.github.com/repo openid email`.

## Fixed (non-configurable) behavior

- `bypassWriteAccessCheckForAppTokens` is always `true`.
- `tokenKeyword` is always `'Bearer'` (used as the `Authorization` header scheme for both the
  Cognito `userInfo` request and subsequent GitHub API calls).
