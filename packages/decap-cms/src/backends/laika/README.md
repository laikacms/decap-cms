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
