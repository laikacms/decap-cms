# `src/core/` — the headless CMS engine

`src/core/` is the framework-agnostic engine: Redux store, config/entry processing, the backend
abstraction, and the extension `Registry`. It has no opinion on layout or routing — the routed `App`
/ `AppContent` layer (and the `CmsSlots` render-slot surface) lives in `@laikacms/decap/app`, built
on top of this package (DCMS-251).

This document covers the public **extension registration API** exposed from
`src/core/lib/registry.tsx` and re-exported from [`src/core/index.ts`](./index.ts) as `Registry`
(and spread onto the default export, `DecapCmsCore`), plus a [config reference](#config-reference)
for collection/top-level `config.yml` keys that are implemented here but not documented anywhere
else in the repo:

```ts
import { Registry } from '@laikacms/decap-cms/core';
// or: import DecapCmsCore from '@laikacms/decap-cms/core';

Registry.registerWidget(/* ... */);
```

The registration functions below are how a consumer plugs custom widgets, backends, preview UI,
editor components, remark plugins, media libraries, locales, event hooks, and file formats into the
CMS.

## Top-level `slug` config

```yaml
# config.yml
slug:
  encoding: unicode # or 'ascii'
  clean_accents: false
  sanitize_replacement: '-'
```

This top-level `slug` object controls how entry slugs and media filenames are sanitized — it is
**not** the same thing as a collection's `collections[].slug` field, which is a per-collection
template _string_ (e.g. `'{{year}}-{{month}}-{{title}}'`) used to derive a slug's shape. The
top-level object instead configures the character-sanitization rules applied to whatever
slug/filename is produced, across every collection. The `collections[].slug` template also supports
`{{ field | filter }}` pipe syntax (`upper`, `lower`, `date()`, `default()`, `ternary()`,
`truncate()`) — see
[`src/lib/widgets/README.md#template-filters`](../lib/widgets/README.md#template-filters). Defaults
are filled in by `applyDefaults` in [`src/core/actions/config.tsx`](./actions/config.tsx), and the
sanitization itself is implemented in [`src/core/lib/urlHelper.tsx`](./lib/urlHelper.tsx). All three
keys are optional:

- **`encoding`** — `'unicode'` (default) or `'ascii'`. `'unicode'` keeps any character allowed in an
  IRI (RFC 3987), including non-ASCII letters; `'ascii'` restricts output to plain URI-safe
  characters (`[\w\-.~]`) only. Any other value throws
  `` `options.encoding` must be "unicode" or "ascii". ``
- **`clean_accents`** — boolean, default `false`. When `true`, diacritics are stripped from the
  generated slug before sanitization (e.g. `café` becomes `cafe`) instead of being encoded or
  replaced.
- **`sanitize_replacement`** — string, default `'-'`. The character(s) substituted for any character
  disallowed by the `encoding` rule above while sanitizing a slug or filename.

## `registerWidget`

```ts
function registerWidget(options: {
  name: string,
  controlComponent: unknown,
  previewComponent?: unknown,
  schema?: unknown,
  allowMapValue?: boolean,
  globalStyles?: unknown,
  [key: string]: unknown,
}): void;
```

Registers a custom editor widget under `options.name`. `controlComponent` is required — registering
without one throws ``Widget "<name>" registered without `controlComponent`.`` `name` is the value
used as `widget:` in a collection field's config; registering the same name twice keeps the last
registration and logs a warning. `previewComponent` is optional and must be a component or plain
object — anything else is dropped with a warning and the widget falls back to no preview.

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

Registers a React component as the preview pane for collection `name` (the collection's `name` in
the CMS config, not a widget name). The component is looked up by `getPreviewTemplate(name)` and
rendered in the entry editor's preview pane instead of the default field-by-field preview.
Registering the same collection name twice keeps the last registration — no warning is logged.

```ts
import { registerPreviewTemplate } from '@laikacms/decap-cms/core';
import PostPreview from './PostPreview';

registerPreviewTemplate('posts', PostPreview);
```

## `registerPreviewStyle`

```ts
function registerPreviewStyle(style: string, opts: { raw: boolean }): void;
```

Adds a stylesheet to the preview pane's iframe. `style` is a URL/path to a CSS file by default; pass
`opts.raw: true` to instead treat `style` as a raw CSS string that gets injected directly. Styles
accumulate — every call appends another entry returned by `getPreviewStyles()`, there is no
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
  BackendClass: new(config: CmsConfig, opts?: Record<string, unknown>) => CmsImplementation,
): void;
```

Registers a custom backend implementation under `name` (the value used as `backend.name` in the CMS
config). `BackendClass` is a class — not an instance — constructed lazily as
`new BackendClass(config, opts)` the first time the backend is initialized. Both `name` and
`BackendClass` are required; missing either logs an error and does nothing. Registering the same
`name` twice is also rejected with a logged error (`Backend [<name>]
already registered.`) — the
first registration wins.

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
  id?: string,
  label?: string,
  icon?: string,
  widget?: string,
  type?: 'code-block' | 'shortcode',
  pattern: RegExp,
  fields?: { name: string, label: string, widget?: string, [key: string]: unknown }[],
  allow_add?: boolean,
  fromBlock: (match: RegExpMatchArray) => unknown,
  toBlock: (data: unknown) => string,
  toPreview: (
    data: unknown,
    getAsset: (value: string, field?: unknown) => string,
    fields?: unknown[],
  ) => string | unknown,
}): void;
```

Registers a custom shortcode/embed for the richtext editor. `pattern` is the regex the editor uses
to detect the component's raw-markdown representation; `fromBlock` parses a regex match into the
component's data, `toBlock` serializes that data back to markdown, and `toPreview` renders it in the
preview pane. Only one component of `type:
'code-block'` may be registered at a time — registering a
second one logs a warning and silently replaces the first.

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

Adds a [remark](https://github.com/remarkjs/remark) plugin to the markdown processing pipeline used
by the richtext widget. `plugin` is whatever `remark().use()` accepts (a plugin function, or a
`[plugin, options]` tuple). Plugins accumulate in registration order via `getRemarkPlugins()`; there
is no de-duplication.

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
    serialize: (value: unknown) => unknown,
    deserialize: (value: unknown) => unknown,
  },
): void;
```

Registers a `serialize`/`deserialize` pair for widget `widgetName`, controlling how that widget's
value is transformed between the in-editor representation and the value persisted to the entry file.
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
  mediaLibrary: { name: string, config?: { multiple?: boolean }, allow_multiple?: boolean },
  options?: { multiple?: boolean },
): void;
```

Registers a custom media library integration under `mediaLibrary.name` (the value used as
`media_library.name` in the CMS config). Registering the same `name` twice throws
`A media library named <name> has already
been registered.` — unlike most other `register*`
functions, this one is not last-write-wins.

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

Registers a UI translation pack under `locale` (an i18n locale code, e.g. `'de'`, matched against
the CMS `locale` config option). `phrases` is a nested object of translation strings, keyed the same
way as the built-in packs under `src/locales/`. Both arguments are required — a missing `locale` or
`phrases` logs an error instead of throwing, and nothing is registered. Registering the same
`locale` twice keeps the last registration.

```ts
import { registerLocale } from '@laikacms/decap-cms/core';

registerLocale('de', {
  app: { header: { content: 'Inhalt' } },
});
```

## `registerEventListener`

```ts
function registerEventListener(
  config: { name: CmsAllowedEvent, handler: Function },
  options?: Record<string, unknown>,
): void;
```

Subscribes `handler` to one of a hardcoded list of allowed lifecycle events (`allowedEvents` in
`src/core/lib/registry.tsx`). Registering with any other `name` throws `Invalid event name '<name>'`
— there is no mechanism to add custom event names. The full list, in the order each pair fires
around its corresponding `Backend` operation (`src/core/backend.tsx`):

| Event           | Fires                          |
| --------------- | ------------------------------ |
| `prePublish`    | before an entry is published   |
| `postPublish`   | after an entry is published    |
| `preUnpublish`  | before an entry is unpublished |
| `postUnpublish` | after an entry is unpublished  |
| `preSave`       | before an entry is saved       |
| `postSave`      | after an entry is saved        |

Multiple handlers may be registered for the same event; they run in registration order via
`invokeEvent`, each receiving `(data, options)` where `data.entry` is the entry being processed — a
handler may return a new entry `data` object, which replaces `data.entry.data` for the next handler
in the chain (this is how `preSave` handlers commonly mutate the entry before it's written). Pair
with `removeEventListener({ name, handler })` to unregister a specific handler (or all handlers for
that event, if `handler` is omitted).

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
    fromFile(content: string): unknown,
    toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string,
  },
): void;
```

Registers a custom file format under `name` (the value used as a collection's `extension`/`format`),
associating it with a file `extension` and a `formatter` that parses (`fromFile`) and serializes
(`toFile`) entry data for that format. Registering the same `name` twice silently overwrites the
previous registration.

```ts
import { registerCustomFormat } from '@laikacms/decap-cms/core';

registerCustomFormat('my-format', 'myext', {
  fromFile: content => JSON.parse(content),
  toFile: data => JSON.stringify(data, null, 2),
});
```

## Config reference

The keys below are validated by the JSON Schema in
[`src/core/lib/validateConfig.ts`](./lib/validateConfig.ts) and applied in
[`src/core/actions/config.tsx`](./actions/config.tsx), but aren't covered anywhere else (DCMS-556).

### `collection.view_filters` / `collection.view_groups`

Preset filter/group buttons shown above a collection's entry list by `CollectionControls` (only
rendered when the array is non-empty). Each entry is an object with:

- `label` (`string`, required) — button text shown to the user.
- `field` (`string`, required) — entry field the filter/group applies to.
- `pattern` (`string | boolean`) — required for `view_filters` (the value/regex a filter matches
  against); optional `string` for `view_groups`.

```yaml
collections:
  - name: posts
    label: Posts
    folder: content/posts
    view_filters:
      - label: 'Drafts'
        field: draft
        pattern: true
      - label: 'Published'
        field: draft
        pattern: false
    view_groups:
      - label: 'Year'
        field: date
        pattern: '\d{4}'
    fields: [...]
```

At config-apply time each entry gets a derived `id: "${field}__${index}__${pattern}"`
(`src/core/actions/config.tsx`, `index` is the entry's position in its own `view_filters` /
`view_groups` list); you don't set `id` yourself. The index keeps ids unique even when `pattern`
is omitted (valid for `view_groups`) or repeated across entries on the same field.

### `collection.sortable_fields` (and deprecated `sortableFields`)

Controls which fields can sort a collection's entry list. Accepts either plain field names or
objects for finer control:

```yaml
collections:
  - name: posts
    label: Posts
    folder: content/posts
    sortable_fields:
      - title
      - field: date
        label: 'Publish date'
        default_sort: desc # or `asc` / boolean
    fields: [...]
```

- `field` (required), `label` (optional, defaults to the field name), `default_sort` (optional,
  `true`/`false` or `'asc'`/`'desc'`) are the only allowed object keys; at most one field in the
  array may set `default_sort`.
- The camelCase alias `sortableFields` still works but is deprecated: it's auto-migrated to
  `sortable_fields` at load time with a `console.warn` (`normalizeConfig` in
  `src/core/actions/config.tsx`). Configs may not set both keys at once (rejected by schema).
- If omitted entirely, a default set is inferred from the collection's identifier/date/author-shaped
  fields (`selectDefaultSortableFields` in `src/core/reducers/collections.tsx`).

### `local_backend`

Enables detection of the local dev proxy server (`decap-server`). Accepts either a boolean or an
object form:

```yaml
# shorthand — proxy expected at http://localhost:8081/api/v1
local_backend: true

# object form
local_backend:
  url: http://localhost:8082/api/v1
  allowed_hosts:
    - my-machine.local
```

- `local_backend: true` (or omitting `url`) assumes the proxy is at `http://localhost:8081/api/v1`.
- `url` overrides the proxy address. Only `http(s)://` URLs make sense here; the request against an
  unreachable/invalid URL fails silently — it just logs
  `Decap CMS Proxy Server not detected at '<url>'` to the console and the app falls back to the
  configured non-local backend (`detectProxyServer` in `src/core/actions/config.tsx`).
- Proxy detection only runs when `location.hostname` is `localhost`, `127.0.0.1`, **or** one of the
  hostnames listed in `allowed_hosts`. `allowed_hosts` lets you develop against the local proxy from
  a hostname other than `localhost`/`127.0.0.1` (e.g. a LAN name or a tunneled domain) — it does not
  affect anything once the proxy has been detected.

### `backend.commit_messages` / `backend.signoff_commits`

Customizes the commit message text the backend uses for each kind of write operation, and optionally
appends a `Signed-off-by` trailer. Implemented in
[`src/core/lib/formatters.tsx`](./lib/formatters.tsx) (`commitMessageFormatter`) and typed on
`CmsBackend` in [`src/lib/util/types/cms/backend.ts`](../lib/util/types/cms/backend.ts).

```yaml
# config.yml
backend:
  name: github
  repo: my-org/my-repo
  signoff_commits: true
  commit_messages:
    create: 'Create {{collection}} "{{slug}}"'
    update: 'Update {{collection}} "{{slug}}"'
    delete: 'Delete {{collection}} "{{slug}}"'
    uploadMedia: 'Upload "{{path}}"'
    deleteMedia: 'Delete "{{path}}"'
    openAuthoring: '{{message}}'
```

`commit_messages` accepts any subset of six keys; any key you omit falls back to its built-in
default (shown above, matching `commitMessageTemplates` in `formatters.tsx`) — you don't have to
restate every key just to override one.

Each template is a plain string with `{{placeholder}}` interpolation. This is a **separate, smaller
placeholder syntax from the widget/slug `stringTemplate` filters** (`collections[].slug`,
`preview_path`, etc.) — there is no `{{upper ...}}`, `{{lower ...}}`, `{{date(...)}}`, or other
filter support here, only flat variable substitution. The supported placeholders are:

- **`{{slug}}`** — the entry's slug. Available in `create`, `update`, `delete`.
- **`{{path}}`** — the file path being written. Available in `uploadMedia`, `deleteMedia`.
- **`{{collection}}`** — the collection's `label_singular` (falling back to `label`). Available in
  `create`, `update`, `delete`.
- **`{{author-login}}`** — the committing user's login/username. Available in every template, but
  only ever populated for Open Authoring commits (see below); otherwise resolves to `''`.
- **`{{author-name}}`** — the committing user's display name. Same availability as
  `{{author-login}}`.
- **`{{message}}`** — the already-formatted commit message from
  `create`/`update`/`delete`/`uploadMedia`/`deleteMedia`. Only meaningful in `openAuthoring`, which
  wraps the other templates' output for Open Authoring PRs/commits; its default is simply
  `'{{message}}'` (passthrough).

Any placeholder not in this list — a typo, or a filter borrowed from `stringTemplate` — is
**silently replaced with an empty string** rather than left as literal `{{...}}` text, and logs a
`console.warn` naming the unrecognized variable. This applies independently to `commit_messages.*`
templates and to `commit_messages.openAuthoring`.

`signoff_commits: true` appends a trailer to the formatted commit message:

```
<formatted commit message>

Signed-off-by: <author name> <<author email>>
```

The trailer requires both the author's name **and** email to be known at commit time. If either is
missing, the trailer is **silently skipped** — no error, only a `console.warn`
(`Option signoff_commits is
enabled, but author name/email is unknown`) — and the commit message is
used as-is.

### `collection.filter`

```yaml
collections:
  - name: posts
    label: Posts
    folder: content/posts
    filter:
      field: draft
      value: false
    fields: [...]
```

Restricts a collection's entry list to entries whose `field` matches `value`, applied in
`Backend#filterEntries` (`src/core/backend.tsx`) after entries are loaded and before display.
Non-matching entries are **silently dropped from the collection view** (list, search results,
relation-widget options, etc.) — nothing is deleted from the repo. Unlike `view_filters` above,
`filter` is unconditional: there's no toggle UI, it always applies. It's also not currently
enumerated in the collection JSON Schema (`src/core/lib/validateConfig.ts`), so a malformed `filter`
object isn't schema-rejected the way most other collection keys are.

Matching rule, from `filterEntries`:

- **Strict equality (`===`)** when the entry's `field` value is not an array — no type coercion, so
  `value: '0'` never matches a numeric `0` field, and `value: false` never matches a falsy
  non-boolean.
- **Array `.includes()` membership** when the entry's `field` value is an array — `value` just needs
  to be one of the array's elements, regardless of array order or length.

### `collection.meta.path` (folder collections)

```yaml
collections:
  - name: posts
    label: Posts
    folder: content/posts
    meta:
      path:
        label: Path
        widget: string
        index_file: _index
    fields: [...]
```

Only valid on folder collections (`collection.folder`, not `collection.files`) — it's stripped by
`applyDefaults` for file collections. Lets editors rename or move an entry's on-disk location from
within the entry form, instead of only through the auto-generated `slug`. All three sub-keys
(`label`, `widget`, `index_file`) are required once `meta.path` is set at all
(`src/core/lib/validateConfig.ts`).

`applyDefaults` (`src/core/actions/config.tsx`) synthesizes `meta.path` into a real virtual field
prepended to `collection.fields`:

```ts
{ name: 'path', meta: true, required: true, ...meta.path }
```

so `label`/`widget` behave like any other field's — the synthesized `path` field renders in the
entry editor using whichever `widget` you choose (typically `string`) — while `index_file` is
config-only and never rendered.

`selectCustomPath` (`src/core/reducers/entryDraft.ts`) resolves the entry's on-disk path from the
field's current value as:

```
<collection.folder>/<path field value>/<index_file>.<extension>
```

Only that single index file is renamed/moved when the `path` field changes — **sibling files in the
same folder are left untouched**. This is meant for a "one subfolder per entry, with peer assets"
layout, e.g. `content/posts/my-post/_index.md` next to `content/posts/my-post/cover.jpg`: renaming
the entry via the `path` field moves `_index.md` to the new subfolder but leaves `cover.jpg` where it
is.
