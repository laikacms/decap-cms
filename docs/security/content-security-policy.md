# Content Security Policy (CSP) for Decap CMS deployments

Decap CMS is a single-page app you mount at `/admin` on your own site. Because it runs
on your domain but talks to third-party origins (your git backend's REST/GraphQL API,
an OAuth provider, and optionally a media library), a
[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) that's
scoped to your site's other pages will usually be too strict for `/admin` and needs a
dedicated policy (either a separate `<meta http-equiv="Content-Security-Policy">` tag on
the admin page, or a path-scoped `Content-Security-Policy` response header for `/admin/*`
if your host supports per-path headers).

This page lists the origins each built-in backend, auth flow, and media library
integration talks to, so you can build an accurate `connect-src` (API calls),
`frame-src`/`child-src` (OAuth popups and Cloudinary/Uploadcare widgets), `script-src`
(third-party widget scripts), and `img-src`/`media-src` (rendered previews) allowlist
instead of falling back to `unsafe-inline`/`*`.

> Decap CMS has no built-in AI-provider integration today, so there's no first-party AI
> origin to allow. If you add a custom widget or backend proxy that calls an AI API,
> add that provider's endpoint to `connect-src` yourself.

## Baseline directives

These apply regardless of backend:

| Directive                 | Recommended value                | Why                                                                                                                                                                                                               |
| ------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`             | `'self'`                         | Fallback deny-by-default.                                                                                                                                                                                         |
| `script-src`              | `'self'`                         | Decap CMS's own bundle. Add specific CDN origins only if you use the CDN quick-start (`unpkg.com` or wherever you host `decap-cms.js`) instead of an npm build.                                                   |
| `style-src`               | `'self' 'unsafe-inline'`         | The editor UI injects inline styles at runtime (rich text/CodeMirror theming); a strict `style-src` without `'unsafe-inline'` will break the editor.                                                              |
| `img-src`                 | `'self' data: blob:`             | Local media previews use `blob:`/`data:` URLs before assets are committed. Add your git host's raw-content/avatar origins (e.g. `avatars.githubusercontent.com`, `raw.githubusercontent.com`) if you render them. |
| `font-src`                | `'self'`                         | No first-party remote font loading.                                                                                                                                                                               |
| `worker-src`              | `'self' blob:`                   | Some editor features (e.g. syntax highlighting) run in web workers created from blob URLs.                                                                                                                        |
| `connect-src`             | `'self'` + backend origins below | XHR/fetch calls the backend `Api`/`GraphQLApi` classes make.                                                                                                                                                      |
| `frame-src` / `child-src` | backend OAuth origin(s) below    | OAuth popup windows and third-party widget iframes (Cloudinary/Uploadcare).                                                                                                                                       |

## Per-backend origins

Source: `backend:` config handling in each `packages/decap-cms-backend-*` package
(`API.ts`/`implementation.ts`/`AuthenticationPage.js`).

### GitHub (`backend.name: github`)

- `connect-src`: `https://api.github.com` (default `api_root`), plus
  `https://api.github.com` again for the GraphQL endpoint (default `graphql_api_root`,
  same origin unless overridden). If you set `api_root`/`graphql_api_root` for GitHub
  Enterprise, use those origins instead.
- `frame-src`: your OAuth provider's authorize origin (self-hosted
  [`decap-cms-oauth-provider`](https://github.com/decaporg/decap-cms-oauth-provider) or
  your own implementation) — this isn't a fixed origin, it's whatever `base_url` you
  configure for the backend's OAuth client.

### GitLab (`backend.name: gitlab`)

- `connect-src`: `https://gitlab.com` (default `apiRoot`,
  `https://gitlab.com/api/v4`) and `https://gitlab.com` for GraphQL (default
  `graphQLAPIRoot`, `https://gitlab.com/api/graphql`). Self-managed GitLab: use your
  instance's origin for both.
- `frame-src`: your GitLab OAuth application's authorize origin (same host as the API
  root for self-managed instances, `https://gitlab.com` for gitlab.com).

### Bitbucket (`backend.name: bitbucket`)

- `connect-src`: `https://api.bitbucket.org` (default `apiRoot`,
  `https://api.bitbucket.org/2.0`).
- `frame-src`: `https://bitbucket.org` (OAuth authorize endpoint).

### Azure DevOps (`backend.name: azure`)

- `connect-src`: your organization's Azure DevOps origin, e.g.
  `https://dev.azure.com` (there's no built-in default — `api_root` is required
  config).
- `frame-src`: `https://login.microsoftonline.com` (the `AuthenticationPage` builds
  its authorize URL as `https://login.microsoftonline.com/{tenant_id}`, using the
  `backend.tenant_id` you configure).

### Gitea (`backend.name: gitea`)

- `connect-src`: `https://try.gitea.io` (default `apiRoot`) or your self-hosted
  instance's origin if you override `api_root`.
- `frame-src`: the same Gitea instance origin (OAuth authorize endpoint lives on the
  instance itself).

### Git Gateway (`backend.name: git-gateway`, Netlify)

Git Gateway proxies GitHub/GitLab/Bitbucket through Netlify, plus Netlify Identity for
auth and Netlify Large Media for LFS-backed assets:

- `connect-src`: your site's own origin for `/.netlify/identity`, `/.netlify/git`, and
  `/.netlify/large-media` (or the `netlifySiteURL` you've pointed the widget at, if
  testing against a different Netlify site than the one serving `/admin`), plus
  `https://api.netlify.com` (Netlify Identity's default API root when no `base_url`
  override is set).
- `frame-src`: `https://api.netlify.com` and your site's own origin (Netlify Identity
  widget) — add your custom `base_url` origin if the site uses a white-labeled
  Identity endpoint. If `auth_type: pkce` is set, no popup is needed, but the token
  exchange still needs `connect-src` for the same origins.
- `img-src`/`media-src`: `https://api.netlify.com` for any status-page assets, and
  your Large Media host if you render LFS-pointer assets directly.

### Proxy backend (`backend.name: proxy`, local development)

- `connect-src`: whatever `proxy_url` you configured (typically
  `http://localhost:8081/api/v1` when using `decap-server` locally). This backend is
  intended for local dev, not production, so it's rarely relevant to a deployed CSP.

### AWS Cognito + GitHub proxy (`backend.name: aws-cognito-github-proxy`)

- `connect-src`: `https://api.github.com` (same as the GitHub backend, once the
  Cognito-issued token is attached), plus whatever `base_url` you set under `auth:`
  (your Cognito user pool domain, e.g.
  `https://your-pool.auth.us-east-1.amazoncognito.com`) for the token/OIDC-discovery
  endpoints.
- `frame-src`: the same `auth.base_url` origin (Cognito Hosted UI authorize page).

## Media library origins

Only needed if you've opted into a non-default `media_library`:

### Cloudinary (`media_library.name: cloudinary`)

- `script-src`: `https://media-library.cloudinary.com` (the widget script is loaded
  from `media-library.cloudinary.com/global/all.js` at runtime).
- `frame-src`/`child-src`: `https://media-library.cloudinary.com` (the widget renders
  in an iframe).
- `connect-src`/`img-src`: `https://res.cloudinary.com` (or your custom Cloudinary
  delivery domain) for uploaded/transformed asset URLs.

### Uploadcare (`media_library.name: uploadcare`)

- `script-src`: `https://ucarecdn.com` (Uploadcare's file-uploader script origin).
- `frame-src`/`child-src`: `https://ucarecdn.com` (upload widget UI).
- `connect-src`/`img-src`: `https://ucarecdn.com` and `https://upload.uploadcare.com`
  for uploads and asset delivery.

## Worked example

A GitHub-backed site using the default (built-in, non-Cloudinary/Uploadcare) media
library and a self-hosted OAuth provider at `https://auth.example.com`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com;
  font-src 'self';
  worker-src 'self' blob:;
  connect-src 'self' https://api.github.com;
  frame-src https://auth.example.com;
  child-src https://auth.example.com;
```

Add the Cloudinary/Uploadcare or Git Gateway origins above if your config uses them,
and swap the `connect-src`/`frame-src` backend origins for whichever backend(s) you
configure.

## Testing your policy

1. Set the CSP in `Content-Security-Policy-Report-Only` mode first (same directives,
   report-only header) and exercise every CMS flow: login, listing entries, saving an
   entry (including the editorial-workflow PR/MR flow if enabled), and uploading media.
2. Watch the browser console for `Refused to connect/frame/load...` violations — each
   one names the exact origin and directive to add.
3. Switch to the enforcing `Content-Security-Policy` header once a full pass produces
   no violations.
