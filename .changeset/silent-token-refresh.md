---
"@laikacms/decap-cms": minor
---

laika backend: silently refresh expired access tokens via the OAuth refresh grant.

The backend now stores the full token triple (access token, refresh token, expiry) and `tokenPromise` re-evaluates expiry on every call, refreshing single-flight through the token endpoint (the server rotates the pair on refresh). An unrecoverably dead session is reported through the new `ImplementationInitOptions.onSessionExpired` callback, exposed as `Backend.onSessionExpired(listener)` and wired by the app shell to a logout — the user gets the login screen instead of stale-session 401s rendered as not-found pages. `currentBackend` is now exported from `./core` so host apps can obtain refresh-aware tokens via `getToken()` instead of reading stored tokens directly.
