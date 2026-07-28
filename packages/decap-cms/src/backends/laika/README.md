# @laikacms/decap-cms/backends/laika

[![npm](https://img.shields.io/npm/v/@laikacms/decap-cms)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![npm](https://img.shields.io/npm/dm/@laikacms/decap-cms)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@laikacms/decap-cms)](https://bundlephobia.com/result?p=@laikacms/decap-cms)

Custom Decap CMS backend for Laika CMS.

## Role in the architecture

This backend is the Decap **adapter** in Laika's two-seam model (see
[`docs/architecture/two-seam-model.md`](../../../../../docs/architecture/two-seam-model.md) at the
repo root). The laikacms protocol (repositories) stays CMS-agnostic and treats content as opaque
JSON; this adapter owns every Decap-specific opinion:

- which fields and shapes Decap expects from documents and assets
- editorial workflow mapping (draft/review/publish onto unpublished/publish)
- deploy previews, commit messages and authors (adapter concerns, never protocol ones)
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

```typescript
import CMS from '@laikacms/decap-cms';
import createLaikaBackend from '@laikacms/decap-cms/backends/laika';

const LaikaBackend = createLaikaBackend({
  documentsApiBaseUrl: '/api/documents',
  assetsApiBaseUrl: '/api/assets',
});

CMS.registerBackend('laika', LaikaBackend);
CMS.init();
```

## Config

```yaml
backend:
  name: laika
  base_url: https://api.example.com
  api_root: /api
```

| Key         | Type     | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | `string` | yes      | Must be `laika`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `base_url`  | `string` | yes      | Origin of the Laika API server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `api_root`  | `string` | no       | Path appended to `base_url` to form the API root (e.g. `/api`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `api_url`   | `string` | no       | **Legacy alias for `api_root`.** Honored only when `api_root` is absent; prefer `api_root` in new configs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `dev_token` | `string` | no       | **Dev/embedded-only. Do not set in production.** A pre-shared bearer token that bypasses the PKCE OAuth flow entirely: `authComponent()` swaps in an auto-login dev auth page instead of the real login page, and `restoreUser()` always authenticates with this static token — on every page load, ignoring any real session in `sessionStorage`. Intended for local-dev / same-origin embedded setups paired with a server started via `createEmbeddedLaika({ auth: { mode: 'dev', devToken } })`, whose token must match. Setting this in production disables real authentication for the CMS. |

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
this limitation, since it isn't obvious from the config that a format even needs to be set. Saving an
entry in a non-JSON collection (`format: yaml`, `format: yaml-frontmatter`, `format: toml`, or the
frontmatter default) now fails fast with a client-side error before any request reaches the server:

```
Laika backend currently only supports JSON-format collections; set `format: json` on collection `posts`.
```

Tracking issue: [DCMS-1254](https://github.com/laikacms/decap-cms/issues/1254).

## Entry locking (not yet implemented)

Decap core supports an optional advisory entry-locking capability
(`getEntryLock`/`acquireEntryLock`/`releaseEntryLock`/`refreshEntryLock` on
`CmsImplementation` — see `src/lib/util/types/cms/backend.ts`) so the editor
can show "Being edited by X" and warn before two users clobber each other's
changes. `LaikaBackend` does not implement it yet.

This backend is the natural place to add server-arbitrated locking (the
issue that motivated the capability — DCMS-1414 — calls this out
specifically: "Multi-user locking likely lands first on the laika backend
where a server can arbitrate"), because it already has a real
`DocumentsRepository` talking to a stateful server, unlike the git-based
backends. Implementing it here needs:

- A lock endpoint/resource on the laikacms documents protocol (acquire,
  release, refresh, get) that this adapter's `LaikaBackend` class can call
  the same way it calls `repo.getDocument`/`repo.updateDocument` today.
- Wiring those calls into the four `CmsImplementation` lock methods,
  following the same `firstResult`/`APIError` conventions already used
  throughout this file for every other repository call.

Until that protocol surface exists, `src/lib/util/entryLockManager.ts` (used
by the `test-repo` backend) is a reference *local* implementation only —
useful for exercising the editor UI, but not a substitute for real
server-side arbitration across different browsers/users.
