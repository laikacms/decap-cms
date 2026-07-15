# Proxy backend

Facilitates [local development](https://www.decapcms.org/docs/beta-features/#working-with-a-local-git-repository).

## Configuration options

Configured via the `backend:` block in the CMS config, e.g.:

```yaml
backend:
  name: proxy
  proxy_url: http://localhost:8081/api/v1
  branch: main
  cms_label_prefix: 'staging/'
```

- `proxy_url` (**required**) - the URL of the `decap-server` (or compatible) proxy endpoint. It must be either:
  - an absolute `http:` or `https:` URL (e.g. `http://localhost:8081/api/v1`), or
  - a root-relative path starting with a single `/` (e.g. `/api/v1`).

  Protocol-relative URLs (`//host/path`) and any other scheme (`ftp:`, `file:`, `javascript:`, etc.) are rejected. If `proxy_url` is missing, the backend throws `The Proxy backend needs a "proxy_url" in the backend configuration.`. If `proxy_url` is present but doesn't match one of the accepted shapes, it throws `The Proxy backend requires an http(s) or root-relative "proxy_url".`.

- `branch` (optional, default: `master`) - the branch name reported to the proxy server for read/write operations.

- `cms_label_prefix` (optional) - a string prefix applied to editorial-workflow labels and branch names sent to the proxy server, useful for namespacing when multiple CMS instances share the same proxy server.

## Code structure

`Implementation` for [File Management System API](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-util/README.md). An `RPC` wrapper for `decap-server`.

`AuthenticationPage` - a mock authentication page
