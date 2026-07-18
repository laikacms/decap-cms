# Proxy backend

A backend that delegates all git operations to an external HTTP proxy server instead of talking to
a git host (GitHub, GitLab, Bitbucket, ...) directly. Useful for local development against
[`decap-server`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-server) or for
routing CMS requests through a custom backend service.

## Code structure

`implementation.tsx` - `ProxyBackend`, a `CmsImplementation` that forwards every read/write
operation as a JSON request to `proxy_url`, and handles media as base64-encoded payloads.

`AuthenticationPage.tsx` - A minimal login screen; the proxy backend doesn't perform real
authentication, it just collects an identity to send along with requests.

## `backend:` config keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `proxy_url` | string | _none (required)_ | The HTTP(S) or root-relative URL of the proxy server that handles content, media, and editorial workflow requests on the CMS's behalf. Construction throws `The Proxy backend needs a "proxy_url" in the backend configuration.` if missing, and `The Proxy backend requires an http(s) or root-relative "proxy_url".` if it isn't a root-relative path (starting with a single `/`) or a valid `http:`/`https:` URL. |
| `branch` | string | `'master'` | Branch the backend reads/writes against. Sent to the proxy server as part of every request payload. |
| `cms_label_prefix` | string | `''` | Prefix added to the labels/statuses the CMS uses to track editorial workflow state, same meaning as the equivalent [GitHub backend](../github/README.md) key. |

## `media_folder` interaction

Unlike git-based backends, the proxy backend reads the top-level `media_folder` config value
directly (not a `backend:`-scoped key) and stores it as-is, defaulting to `''` when unset. It is
sent to the proxy server on media-related requests so the proxy knows which folder to read from and
write to.
