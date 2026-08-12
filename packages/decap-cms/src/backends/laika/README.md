# @laikacms/decap-cms/backends/laika

[![npm](https://img.shields.io/npm/v/@laikacms/decap-cms)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![npm](https://img.shields.io/npm/dm/@laikacms/decap-cms)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@laikacms/decap-cms)](https://bundlephobia.com/result?p=@laikacms/decap-cms)

Custom Decap CMS backend for Laika CMS.

## Role in the architecture

This backend is the Decap **adapter** in Laika's two-seam model (see
[`docs/contributing/decisions/two-seam-model.md`](../../../../../docs/contributing/decisions/two-seam-model.md)
at the repo root). The laikacms protocol (repositories) stays CMS-agnostic and treats content as
opaque JSON; this adapter owns every Decap-specific opinion:

- which fields and shapes Decap expects from documents and assets
- editorial workflow mapping (draft/review/publish onto unpublished/publish)
- commit messages and authors (adapter concerns, never protocol ones); deploy previews are **not**
  implemented — `getDeployPreview` unconditionally returns `null`
- translating protocol capabilities (pagination, version tracking, change signals) into Decap's
  fetching and caching behavior

Other CMS frontends get their own adapters with their own opinions. Swapping CMS frontends therefore
requires a migration; this is intended.

## Installation

This module is a subpath export of `@laikacms/decap-cms`:

```bash
pnpm add @laikacms/decap-cms
```

## Usage

**Import from `laika-app`, not the package root.** The root entry point (`@laikacms/decap-cms`, the
default app bundle) never registers this backend — only `@laikacms/decap-cms/laika-app` does (see
[`src/laika-app/extensions.ts`](../../laika-app/extensions.ts)). Setting `backend: { name: laika }`
against the root import silently fails at runtime with no registered backend.

The simplest path is `laika-app` itself, which registers `laika` (and every other built-in backend,
widget, and format) and auto-initializes:

```typescript
import '@laikacms/decap-cms/laika-app';
```

`config.yml` then just needs `backend: { name: laika, ... }` — see [Config](#config) below.

For a leaner bundle, compose from `laika-app/bare` and register only `laika`:

```typescript
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';
import { CMS, init } from '@laikacms/decap-cms/laika-app/bare';

CMS.registerBackend(
  'laika',
  createLaikaBackend({
    documentsApiBaseUrl: '/api/documents',
    assetsApiBaseUrl: '/api/assets',
  }),
);

init();
```

## Config

```yaml
backend:
  name: laika
  base_url: https://api.example.com
  api_root: /api
```

| Key                                | Type      | Required           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                             | `string`  | yes                | Must be `laika`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `base_url`                         | `string`  | yes                | Origin of the Laika API server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `api_root`                         | `string`  | no                 | Path appended to `base_url` to form the API root (e.g. `/api`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `api_url`                          | `string`  | no                 | **Legacy alias for `api_root`.** Honored only when `api_root` is absent; prefer `api_root` in new configs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `dev_token`                        | `string`  | no                 | **Dev/embedded-only. Do not set in production.** A pre-shared bearer token that bypasses the PKCE OAuth flow entirely: `authComponent()` swaps in an auto-login dev auth page instead of the real login page, and `restoreUser()` always authenticates with this static token — on every page load, ignoring any real session in `sessionStorage`. Intended for local-dev / same-origin embedded setups paired with a server started via `createEmbeddedLaika({ auth: { mode: 'dev', devToken } })`, whose token must match. Setting this in production disables real authentication for the CMS. |
| `app_id`                           | `string`  | **yes, for OAuth** | The OAuth application's client ID, sent as `client_id` in both the authorization redirect and the token exchange. Read by `PKCEAuthenticationPage.componentDidMount` (`AuthenticationPage.tsx`); when `dev_token` is not set (i.e. the real PKCE login path is used), a missing `app_id` fails immediately with `loginError: 'Missing required configuration: base_url and app_id are required'` — no login button works until it's set.                                                                                                                                                          |
| `auth_endpoint`                    | `string`  | no                 | Path (relative to `base_url`) of the provider's OAuth2 authorization endpoint. Default: `oauth2/authorize`. Ignored when `use_oidc` is `true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `auth_token_endpoint`              | `string`  | no                 | Path (relative to `base_url`) of the provider's OAuth2 token endpoint. Default: `oauth2/token`. Used for both the initial token exchange (`PKCEAuthenticationPage`) and token refresh (`LaikaBackend`, `laika-backend.ts`). Ignored when `use_oidc` is `true`.                                                                                                                                                                                                                                                                                                                                    |
| `auth_token_endpoint_content_type` | `string`  | no                 | `Content-Type` header sent with the token exchange `POST` request. Default: `application/x-www-form-urlencoded; charset=utf-8`. Used by both the login flow and token refresh.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `use_oidc`                         | `boolean` | no                 | When `true`, skip `auth_endpoint`/`auth_token_endpoint` and instead discover them from the provider's OpenID Connect discovery document at `${base_url}/.well-known/openid-configuration`. Default: `false`.                                                                                                                                                                                                                                                                                                                                                                                      |
| `acceptRoles`                      | `string[]` | no                | Role allowlist enforced in `authenticate()`. When set, the `role` attribute the `/session` endpoint returns for the authenticated user must be one of these values, or `authenticate()` throws an `APIError` (status `403`) — no repositories are initialized and no session is persisted to `sessionStorage`. `restoreUser()` re-runs this check on every page load (it delegates to `authenticate()`). Omit (the default) to admit any authenticated session regardless of role, same as before this option existed. A session with no `role` attribute is rejected whenever `acceptRoles` is set. |

These five OAuth-related keys are consumed by `PkceAuthenticator` (see
[`src/lib/auth/README.md`](../../lib/auth/README.md#pkceauthenticatorconfig) for the generic PKCE
config semantics); `laika`'s `AuthenticationPage.tsx` is one of its consumers.

## Local/remote backend resolution — `resolveLaikaBackend()`

`resolveLaikaBackend({ local, remote, dev })` picks the `backend:` config block for you, so a single
admin config can target the local Vite-dev JSON:API (served by `@laikacms/vite-plugin`) while
developing and the remote OAuth backend (`createLaikaBackend`, see [Config](#config) above)
everywhere else — no manual switching between environments.

It is re-exported from the package root alongside `createLaikaBackend` and `DevAuthenticationPage`:

```typescript
import { resolveLaikaBackend } from '@laikacms/decap-cms/backends/laika';
```

Selection is based on `import.meta.env.DEV`, read directly unless the `dev` option overrides it:

- **Truthy** (running under `vite dev`) → returns a local-mode config pointing at the local
  JSON:API.
- **Falsy, or `import.meta.env` is not defined at all** (production build, standalone admin,
  `vite
  preview`, non-Vite bundling) → returns `remote` unchanged. This is a deliberate fail-safe:
  an admin loaded outside a Vite-bundled dev context never targets a phantom local endpoint.

Local mode only engages when the admin config itself is bundled by Vite — an admin config authored
as static YAML/JSON and loaded outside a Vite build never sees `import.meta.env.DEV` substituted, so
it always falls back to `remote`.

### Options (`ResolveLaikaBackendOptions`)

| Option   | Type                       | Required | Description                                                                                                                                              |
| -------- | -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remote` | `LaikaBackendModuleConfig` | yes      | The `backend:` block for the OAuth flow, returned as-is whenever the dev flag is not truthy.                                                             |
| `local`  | `LocalLaikaBackendOptions` | no       | Local-mode overrides, applied only when the dev flag is truthy. Omit to use the defaults below.                                                          |
| `dev`    | `boolean`                  | no       | Override for `import.meta.env.DEV`. Real call sites should omit this; it exists so tests can exercise both branches deterministically without a bundler. |

`local` accepts:

| Key        | Type     | Default                                               | Description                                                                                                                                  |
| ---------- | -------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `basePath` | `string` | `/__laika` (`DEFAULT_LOCAL_BACKEND_BASE_PATH`)        | Base path the local JSON:API is mounted at. Must match the `localApi.basePath` configured on `@laikacms/vite-plugin` (or its default).       |
| `devToken` | `string` | `laika-local-dev` (`DEFAULT_LOCAL_BACKEND_DEV_TOKEN`) | Dummy token `DevAuthenticationPage` submits. Local mode performs no real auth, so this only needs to be non-empty and stable across reloads. |

`DEFAULT_LOCAL_BACKEND_BASE_PATH` and `DEFAULT_LOCAL_BACKEND_DEV_TOKEN` are also re-exported
directly, so callers can reuse them (e.g. to configure `@laikacms/vite-plugin`'s `localApi.basePath`
to match).

### Usage

```typescript
import { resolveLaikaBackend } from '@laikacms/decap-cms/backends/laika';

const backend = resolveLaikaBackend({
  remote: {
    name: 'laika',
    base_url: 'https://api.example.com',
    api_root: '/api',
  },
  // Optional — omit to use the /__laika + laika-local-dev defaults.
  local: {
    basePath: '/__laika',
    devToken: 'laika-local-dev',
  },
});
```

`resolveLaikaBackend()` returns a plain config object, not a function — call it from your admin's
TypeScript entry point (not `config.yml`, which has no access to `import.meta.env`) and pass the
result as the `backend` field of the config handed to `CMS.init`:

```typescript
import { resolveLaikaBackend } from '@laikacms/decap-cms/backends/laika';
import { CMS, init } from '@laikacms/decap-cms/laika-app/bare';

init({
  config: {
    backend: resolveLaikaBackend({
      remote: { name: 'laika', base_url: 'https://api.example.com', api_root: '/api' },
    }),
    // ...rest of config.yml equivalent
  },
});
```

## Options

All options are passed to `createLaikaBackend(options)`. Every field is optional.

| Option                   | Type                                                              | Default        | Description                                                     |
| ------------------------ | ----------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `documentsApiBaseUrl`    | `string`                                                          | —              | Base URL used by the default `DocumentsJsonApiProxyRepository`. |
| `assetsApiBaseUrl`       | `string`                                                          | —              | Base URL used by the default `AssetsJsonApiProxyRepository`.    |
| `getDocumentsRepository` | `(options: GetDocumentsRepositoryOptions) => DocumentsRepository` | built-in proxy | Factory that returns a custom `DocumentsRepository`.            |
| `getAssetsRepository`    | `(options: GetAssetsRepositoryOptions) => AssetsRepository`       | built-in proxy | Factory that returns a custom `AssetsRepository`.               |
| `onWarning`              | `(error: LaikaError) => void`                                     | `console.warn` | Called for every recoverable warning emitted by the backend.    |

### `getDocumentsRepository`

Inject a custom `DocumentsRepository` — useful for in-process testing, local mocks, or direct
database access without an HTTP proxy.

The factory receives a `GetDocumentsRepositoryOptions` object:

```ts
interface GetDocumentsRepositoryOptions {
  /** Resolves to the current bearer token. */
  tokenPromise: () => Promise<string>;
  /**
   * The backend's resolved API URL: `base_url` combined with `api_root`/`api_url`
   * (i.e. the same value the default proxy repositories hit at `${baseUrl}/session`,
   * `${baseUrl}/health`, etc). This is **not** `documentsApiBaseUrl` — that option is
   * only consumed by the built-in `defaultGetDocumentsRepository` and is never passed
   * to a custom factory. If you need a different origin for documents, read it from
   * your own config/closure instead of from `opts.baseUrl`.
   */
  baseUrl: string;
}
```

Example — swap in an in-memory repository for Storybook / unit tests:

```typescript
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';
import { InMemoryDocumentsRepository } from './test-helpers';

const LaikaBackend = createLaikaBackend({
  getDocumentsRepository: ({ tokenPromise, baseUrl }) => {
    return new InMemoryDocumentsRepository({ tokenPromise, baseUrl });
  },
});
```

### `getAssetsRepository`

Inject a custom `AssetsRepository` for media and binary files.

The factory receives a `GetAssetsRepositoryOptions` object:

```ts
interface GetAssetsRepositoryOptions {
  /** Resolves to the current bearer token. */
  tokenPromise: () => Promise<string>;
  /**
   * The backend's resolved API URL: `base_url` combined with `api_root`/`api_url`
   * (the same value used internally as `this.apiUrl`). This is **not**
   * `assetsApiBaseUrl` — that option is only consumed by the built-in
   * `defaultGetAssetsRepository` and is never passed to a custom factory. To point
   * assets at a different origin (as in the example below), pass it explicitly
   * rather than relying on `opts.baseUrl`.
   */
  baseUrl: string;
}
```

Example — point assets at a different origin than documents:

```typescript
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';
import { AssetsJsonApiProxyRepository } from 'laikacms/assets/jsonapi-proxy';

const LaikaBackend = createLaikaBackend({
  getAssetsRepository: ({ tokenPromise }) => {
    return new AssetsJsonApiProxyRepository({
      tokenPromise,
      baseUrl: 'https://assets.example.com',
    });
  },
});
```

### `onWarning`

Called for every recoverable warning the backend encounters (for example, a partial-success state
where the CMS operation succeeded but a secondary action — such as an R2 readback — fell back to a
synthesized response).

By default, warnings are written to `console.warn` so they surface in browser devtools. Provide your
own handler to route them to a structured logger or error-tracking service.

```typescript
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';
import * as Sentry from '@sentry/browser';

const LaikaBackend = createLaikaBackend({
  onWarning: error => {
    // Route to Sentry as a breadcrumb so warnings appear alongside errors
    Sentry.addBreadcrumb({
      category: 'laika-backend',
      message: `[${error.code}] ${error.message}`,
      level: 'warning',
    });
    // Also keep the devtools line
    console.warn('Laika Backend warning:', error);
  },
});
```

Or with a structured logger:

```typescript
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';
import { logger } from './logger';

const LaikaBackend = createLaikaBackend({
  onWarning: error => {
    logger.warn({ code: error.code, message: error.message }, 'laika-backend recoverable warning');
  },
});
```

## Features

- Editorial workflow (draft/review/publish)
- Media library integration
- i18n support (multiple folders)
- Custom repository injection

## Supported collection formats

**Only `format: json` collections are currently supported.** The laikacms documents API requires
`content` to be a plain object; this backend can only produce that shape for JSON-format entries.

```yaml
collections:
  - name: posts
    label: Posts
    folder: _posts
    format: json # required — Decap's default (markdown-frontmatter) is not yet supported
    fields:
      - { label: Title, name: title, widget: string }
```

If a collection omits `format:`, Decap defaults to markdown-frontmatter — the most common source of
this limitation, since it isn't obvious from the config that a format even needs to be set. Saving
an entry in a non-JSON collection (`format: yaml`, `format: yaml-frontmatter`, `format: toml`, or
the frontmatter default) now fails fast with a client-side error before any request reaches the
server:

```
Laika backend currently only supports JSON-format collections; set `format: json` on collection `posts`.
```

Tracking issue: [DCMS-1254](https://github.com/laikacms/decap-cms/issues/1254).

## Entry locking

Server-arbitrated advisory locking is implemented (ADR-007 in the `laikacms` repo). When two editors
open the same entry, the second sees a "Being edited by X" banner, arbitrated by the backend rather
than by one browser's local state.

`LaikaBackend` implements the four optional `BackendImplementation` lock methods against
`@laikacms/server/api`'s `/locks` endpoint, which is itself a thin adapter over the documents
repository's `acquireLock`/`refreshLock`/ `releaseLock`/`getLock`. The chain is:

```
LaikaBackend.acquireEntryLock
  -> POST {apiUrl}/locks/{path}          (@laikacms/server/api)
  -> documents.acquireLock(key, owner)   (laikacms DocumentsRepository)
  -> the backend's own atomic primitive
```

Two details worth knowing:

- **The owner is never sent.** The server derives the lock owner from the authenticated principal,
  so a client cannot take a lock as somebody else. The `owner` argument these methods receive is
  therefore unused here.
- **The client holds a token.** Acquire returns an opaque bearer token, kept in memory per path and
  replayed on refresh and release; the server authorises on the token, not on identity. Tokens are
  dropped on `logout()`. `getEntryLock` never returns one, so polling to render the banner cannot
  confer the ability to steal or release a lock.

### Degradation

| Server response | Behaviour                                                                               |
| --------------- | --------------------------------------------------------------------------------------- |
| `423 Locked`    | Rejects, so core fetches the holder and raises the conflict banner                      |
| `501`           | Resolves `null`: this deployment's backend cannot lock, so the editor hides the lock UI |
| network failure | Resolves `null`/void, same as above                                                     |

The distinction matters: a rejection means "someone else genuinely holds this", and anything else
means "we cannot arbitrate right now". Collapsing the two would either false-alarm a conflict or
block an edit that should be allowed.

Locks are advisory: nothing blocks a write. Enforcement-on-write (ADR-007's `precondition` ladder)
is deferred.

### Multi-node deployments

Check `documents.getCapabilities().locks.scope`. The bundled `InProcessLockManager`
(`laikacms/locks/in-process`) reports `'in-process'`: correct for a single node and for tests, but
each node holds its own map, so locks are invisible across nodes. A multi-node deployment needs a
repository whose datasource has a real conditional write, reporting `'shared'`.
