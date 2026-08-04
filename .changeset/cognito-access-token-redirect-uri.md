---
"@laikacms/decap-cms": minor
---

laika backend: use the Cognito access token as the API bearer instead of the id_token (the
management server resolves the user by `sub` and requires `token_use: 'access'`), and let
`PkceAuthenticator` take an explicit `redirect_uri` plus a `return_to` path carried in `state`
alongside the CSRF nonce, so the embedded CMS can use one fixed Cognito callback route and bounce
back to the originating per-project route. `return_to` is validated as a same-origin path both at
construction and again before the nonce is consumed. Also fixes a nonce-replay bug where
`validateNonce` only cleared `localStorage` while `createNonce` wrote to `sessionStorage`.
