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

The registration functions below are how a consumer plugs custom
widgets, backends, preview UI, editor components, remark plugins,
media libraries, locales, event hooks, and file formats into the CMS.

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

## `registerPreviewTemplate`

```ts
function registerPreviewTemplate(name: string, component: React.ComponentType<unknown>): void;
```

Registers a React component as the preview pane for collection `name`
(the collection's `name` in the CMS config, not a widget name). The
component is looked up by `getPreviewTemplate(name)` and rendered in the
entry editor's preview pane instead of the default field-by-field
preview. Registering the same collection name twice keeps the last
registration — no warning is logged.

```ts
import { registerPreviewTemplate } from '@laikacms/decap-cms/core';
import PostPreview from './PostPreview';

registerPreviewTemplate('posts', PostPreview);
```

## `registerPreviewStyle`

```ts
function registerPreviewStyle(style: string, opts: { raw: boolean }): void;
```

Adds a stylesheet to the preview pane's iframe. `style` is a URL/path to
a CSS file by default; pass `opts.raw: true` to instead treat `style` as
a raw CSS string that gets injected directly. Styles accumulate — every
call appends another entry returned by `getPreviewStyles()`, there is no
de-duplication.

```ts
import { registerPreviewStyle } from '@laikacms/decap-cms/core';

registerPreviewStyle('/preview.css');
registerPreviewStyle('body { font-family: sans-serif; }', { raw: true });
```

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

## `registerEditorComponent`

```ts
function registerEditorComponent(component: {
  id?: string;
  label?: string;
  icon?: string;
  widget?: string;
  type?: 'code-block' | 'shortcode';
  pattern: RegExp;
  fields?: { name: string; label: string; widget?: string; [key: string]: unknown }[];
  allow_add?: boolean;
  fromBlock: (match: RegExpMatchArray) => unknown;
  toBlock: (data: unknown) => string;
  toPreview: (
    data: unknown,
    getAsset: (value: string, field?: unknown) => string,
    fields?: unknown[],
  ) => string | unknown;
}): void;
```

Registers a custom shortcode/embed for the richtext editor. `pattern` is
the regex the editor uses to detect the component's raw-markdown
representation; `fromBlock` parses a regex match into the component's
data, `toBlock` serializes that data back to markdown, and `toPreview`
renders it in the preview pane. Only one component of `type:
'code-block'` may be registered at a time — registering a second one
logs a warning and silently replaces the first.

```ts
import { registerEditorComponent } from '@laikacms/decap-cms/core';

registerEditorComponent({
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'id', label: 'Video ID', widget: 'string' }],
  pattern: /^{{< youtube (\S+) >}}$/,
  fromBlock: match => ({ id: match[1] }),
  toBlock: data => `{{< youtube ${data.id} >}}`,
  toPreview: data => `<img src="https://img.youtube.com/vi/${data.id}/0.jpg" />`,
});
```

## `registerRemarkPlugin`

```ts
function registerRemarkPlugin(plugin: Pluggable): void;
```

Adds a [remark](https://github.com/remarkjs/remark) plugin to the
markdown processing pipeline used by the richtext widget. `plugin` is
whatever `remark().use()` accepts (a plugin function, or a
`[plugin, options]` tuple). Plugins accumulate in registration order via
`getRemarkPlugins()`; there is no de-duplication.

```ts
import { registerRemarkPlugin } from '@laikacms/decap-cms/core';
import remarkGfm from 'remark-gfm';

registerRemarkPlugin(remarkGfm);
```

## `registerWidgetValueSerializer`

```ts
function registerWidgetValueSerializer(
  widgetName: string,
  serializer: {
    serialize: (value: unknown) => unknown;
    deserialize: (value: unknown) => unknown;
  },
): void;
```

Registers a `serialize`/`deserialize` pair for widget `widgetName`,
controlling how that widget's value is transformed between the
in-editor representation and the value persisted to the entry file.
Registering the same `widgetName` twice keeps the last registration.

```ts
import { registerWidgetValueSerializer } from '@laikacms/decap-cms/core';

registerWidgetValueSerializer('rating', {
  serialize: value => String(value),
  deserialize: value => Number(value),
});
```

## `registerMediaLibrary`

```ts
function registerMediaLibrary(
  mediaLibrary: { name: string; config?: { multiple?: boolean }; allow_multiple?: boolean },
  options?: { multiple?: boolean },
): void;
```

Registers a custom media library integration under `mediaLibrary.name`
(the value used as `media_library.name` in the CMS config). Registering
the same `name` twice throws `A media library named <name> has already
been registered.` — unlike most other `register*` functions, this one
is not last-write-wins.

```ts
import { registerMediaLibrary } from '@laikacms/decap-cms/core';

registerMediaLibrary({ name: 'my-media-library' });
```

```yaml
# config.yml
media_library:
  name: my-media-library
```

## `registerLocale`

```ts
function registerLocale(locale: string, phrases: Record<string, unknown>): void;
```

Registers a UI translation pack under `locale` (an i18n locale code,
e.g. `'de'`, matched against the CMS `locale` config option).
`phrases` is a nested object of translation strings, keyed the same way
as the built-in packs under `src/locales/`. Both arguments are required
— a missing `locale` or `phrases` logs an error instead of throwing, and
nothing is registered. Registering the same `locale` twice keeps the
last registration.

```ts
import { registerLocale } from '@laikacms/decap-cms/core';

registerLocale('de', {
  app: { header: { content: 'Inhalt' } },
});
```

## `registerEventListener`

```ts
function registerEventListener(
  config: { name: CmsAllowedEvent; handler: Function },
  options?: Record<string, unknown>,
): void;
```

Subscribes `handler` to one of a hardcoded list of allowed lifecycle
events (`allowedEvents` in `src/core/lib/registry.tsx`). Registering
with any other `name` throws `Invalid event name '<name>'` — there is no
mechanism to add custom event names. The full list, in the order each
pair fires around its corresponding `Backend` operation
(`src/core/backend.tsx`):

| Event | Fires |
| --- | --- |
| `prePublish` | before an entry is published |
| `postPublish` | after an entry is published |
| `preUnpublish` | before an entry is unpublished |
| `postUnpublish` | after an entry is unpublished |
| `preSave` | before an entry is saved |
| `postSave` | after an entry is saved |

Multiple handlers may be registered for the same event; they run in
registration order via `invokeEvent`, each receiving `(data, options)`
where `data.entry` is the entry being processed — a handler may return a
new entry `data` object, which replaces `data.entry.data` for the next
handler in the chain (this is how `preSave` handlers commonly mutate the
entry before it's written). Pair with
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
