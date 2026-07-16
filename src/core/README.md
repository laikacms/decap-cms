# `src/core/` — the headless CMS engine

`src/core/` is the framework-agnostic engine: Redux store, config/entry
processing, the backend abstraction, and the extension `Registry`. It has
no opinion on layout or routing — the routed `App` / `AppContent` layer
(and the `CmsSlots` render-slot surface) lives in `@laikacms/decap/app`,
built on top of this package (DCMS-251).

This document covers the public **extension registration API** exposed
from `src/core/lib/registry.tsx` and re-exported from
[`src/core/index.ts`](./index.ts) as `Registry` (and spread onto the
default export, `DecapCmsCore`):

```ts
import { Registry } from '@laikacms/decap-cms/core';
// or: import DecapCmsCore from '@laikacms/decap-cms/core';

Registry.registerWidget(/* ... */);
```

The four registration functions below are how a consumer plugs custom
widgets, backends, event hooks, and file formats into the CMS.

## `registerWidget`

```ts
function registerWidget(options: {
  name: string;
  controlComponent: unknown;
  previewComponent?: unknown;
  schema?: unknown;
  allowMapValue?: boolean;
  globalStyles?: unknown;
  [key: string]: unknown;
}): void;
```

Registers a custom editor widget under `options.name`. `controlComponent`
is required — registering without one throws
`` Widget "<name>" registered without `controlComponent`. `` `name` is the
value used as `widget:` in a collection field's config; registering the
same name twice keeps the last registration and logs a warning.
`previewComponent` is optional and must be a component or plain object —
anything else is dropped with a warning and the widget falls back to no
preview.

```ts
import { registerWidget } from '@laikacms/decap-cms/core';
import { RatingControl, RatingPreview } from './rating-widget';

registerWidget({
  name: 'rating',
  controlComponent: RatingControl,
  previewComponent: RatingPreview,
  schema: { properties: { max: { type: 'number' } } },
});
```

Use it in a collection field with `widget: rating`.

## `registerBackend`

```ts
function registerBackend(
  name: string,
  BackendClass: new (config: CmsConfig, opts?: Record<string, unknown>) => CmsImplementation,
): void;
```

Registers a custom backend implementation under `name` (the value used as
`backend.name` in the CMS config). `BackendClass` is a class — not an
instance — constructed lazily as `new BackendClass(config, opts)` the
first time the backend is initialized. Both `name` and `BackendClass` are
required; missing either logs an error and does nothing. Registering the
same `name` twice is also rejected with a logged error (`Backend [<name>]
already registered.`) — the first registration wins.

```ts
import { registerBackend } from '@laikacms/decap-cms/core';
import MyBackend from './my-backend';

registerBackend('my-backend', MyBackend);
```

```yaml
# config.yml
backend:
  name: my-backend
```

## `registerEventListener`

```ts
function registerEventListener(
  config: { name: CmsAllowedEvent; handler: Function },
  options?: Record<string, unknown>,
): void;
```

Subscribes `handler` to one of the allowed lifecycle events:
`prePublish`, `postPublish`, `preUnpublish`, `postUnpublish`, `preSave`,
`postSave`. Registering with any other `name` throws `Invalid event name
'<name>'`. Multiple handlers may be registered for the same event; they
run in registration order via `invokeEvent`, each receiving `(data,
options)` where `data.entry` is the entry being processed — `preSave`
handlers may return a new entry `data` object, which replaces
`data.entry.data` for the next handler in the chain. Pair with
`removeEventListener({ name, handler })` to unregister a specific handler
(or all handlers for that event, if `handler` is omitted).

```ts
import { registerEventListener } from '@laikacms/decap-cms/core';

registerEventListener({
  name: 'preSave',
  handler: async ({ entry }) => {
    return { ...entry.data, updatedAt: new Date().toISOString() };
  },
});
```

## `registerCustomFormat`

```ts
function registerCustomFormat(
  name: string,
  extension: string,
  formatter: {
    fromFile(content: string): unknown;
    toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string;
  },
): void;
```

Registers a custom file format under `name` (the value used as a
collection's `extension`/`format`), associating it with a file
`extension` and a `formatter` that parses (`fromFile`) and serializes
(`toFile`) entry data for that format. Registering the same `name` twice
silently overwrites the previous registration.

```ts
import { registerCustomFormat } from '@laikacms/decap-cms/core';

registerCustomFormat('my-format', 'myext', {
  fromFile: content => JSON.parse(content),
  toFile: data => JSON.stringify(data, null, 2),
});
```
