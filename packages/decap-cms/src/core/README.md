# `src/core/` — the headless CMS engine

`src/core/` is the framework-agnostic engine: Redux store, config/entry processing, the backend
abstraction, and the extension `Registry`. It has no opinion on layout or routing — the routed `App`
/ `AppContent` layer (and the `CmsSlots` render-slot surface) lives in `@laikacms/decap-cms/app`,
built on top of this package (DCMS-251).

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

## Theming

The CMS's design tokens (currently colors) are resolved through CSS custom properties
(`--decap-color-*` / `--decap-color-raw-*`), so every component that reads a token can be re-themed
without touching component code. Two ways to plug in a theme:

```tsx
import { DecapCmsProvider } from '@laikacms/decap-cms/core';
import type { DecapTheme } from '@laikacms/decap-cms/core';

const theme: DecapTheme = {
  colors: {
    active: '#e91e63',
    background: '#111111',
  },
};

<DecapCmsProvider theme={theme}>{/* ... */}</DecapCmsProvider>;
```

- **`DecapTheme`** — the shape a consumer supplies. Both keys are optional; omitted tokens keep
  their default:
  ```ts
  interface DecapTheme {
    /** Semantic colors — `text`, `active`, `background`, `errorText`, … */
    colors?: Partial<Colors>;
    /** The raw color palette — `white`, `blue`, `purple`, … */
    colorsRaw?: Partial<ColorsRaw>;
  }
  ```
  `Colors` and `ColorsRaw` are defined in [`src/ui/default/styles.tsx`](../ui/default/styles.tsx);
  see that file for the full token lists and their defaults.
- **`theme` prop on `DecapCmsProvider`** — the normal path. `DecapCmsProvider` converts the theme to
  CSS variables internally (`<Global styles={{ ':root': themeToCssVars(theme) }} />`) and applies
  them on top of the default token baseline, which is always emitted first so every token has a
  defined value on first paint.
- **`themeToCssVars(theme: DecapTheme): Record<string, string>`** — exported from
  `@laikacms/decap-cms/core` (re-exported from
  [`src/ui/default/styles.tsx`](../ui/default/styles.tsx)) for consumers who want to emit the
  `--decap-*` variables themselves instead of going through the `theme` prop — e.g. to merge them
  into a host app's own stylesheet or theming system, as `laika-app` does for its light/dark themes
  (`laikaThemes.ts`, `LaikaThemeContext.tsx`). Only string values are emitted; non-string values on
  the theme object are silently dropped. Naming convention: `theme.colors.active` becomes
  `--decap-color-active`, `theme.colorsRaw.blue` becomes `--decap-color-raw-blue`.
  ```ts
  themeToCssVars({ colors: { active: '#e91e63' } });
  // => { '--decap-color-active': '#e91e63' }
  ```

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
  BackendClass: new(config: CmsConfig, opts?: Record<string, unknown>) => BackendImplementation,
): void;
```

Registers a custom backend implementation under `name` (the value used as `backend.name` in the CMS
config). `BackendClass` is a class — not an instance — constructed lazily as
`new BackendClass(config, opts)` the first time the backend is initialized. Both `name` and
`BackendClass` are required; missing either logs an error and does nothing. Registering the same
`name` twice is also rejected with a logged error (`Backend [<name>]
already registered.`) — the
first registration wins.

`BackendImplementation` (and the `BackendClass` constructor type above) is published from
`@laikacms/decap-cms/lib/backend`; see `src/lib/backend/README.md` for the seam it defines.

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

## `registerBlock`

`registerEditorComponent` was removed; custom richtext embeds/shortcodes are now registered as
**blocks** — a PT-native (Portable Text) replacement documented in full at
`src/widgets/richtext/README.md` ("Custom blocks"). See `breaking-changes-v4-beta.md` for the
removal context.

```ts
interface BlockDefinition<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string; // PT `_type` and stable id — reserved ids are rejected on register
  label?: string;
  icon?: ReactNode; // slash menu / toolbar / block chrome
  inline?: boolean; // inline object (child of a text block) instead of block-level
  fields: BlockFieldConfig[]; // decap fields editing the block data; [] = no editable props
  defaultData?: TData | (() => TData);
  keywords?: string[]; // extra slash-menu search keywords
  preview?: ComponentType<BlockPreviewProps<TData>>; // editor AND preview pane; fallback chrome if absent
  editableRegions?: string[]; // reserved for the visual editor; currently unused
  formats?: { markdown?: BlockFormatCodec<TData>, [formatId: string]: unknown }; // per-format serialization
}
```

`registerBlock` — and `unregisterBlock` — are public methods on the `CMS` object; the implementation
lives in `src/core/lib/registry.tsx` and delegates to `src/lib/richtext/blocks/registry.ts`.
Register at boot, before any entry is parsed.

```ts
import { markdownFormat } from '@laikacms/decap-cms/format-packs/markdown';
import { CMS } from '@laikacms/decap-cms/laika-app/bare';

CMS.registerBlock({
  id: 'youtube',
  label: 'YouTube',
  fields: [{ name: 'videoId', label: 'Video ID', widget: 'string' }],
  formats: {
    markdown: {
      pattern: /^{{< youtube (\S+) >}}/,
      fromMatch: match => ({ videoId: match[1] }),
      serialize: data => `{{< youtube ${data.videoId} >}}`,
    },
  },
});
CMS.registerRichtextFormat(markdownFormat);
```

## `registerRemarkPlugin`

```ts
function registerRemarkPlugin(plugin: Pluggable): void;
```

Registers a [remark](https://github.com/remarkjs/remark) plugin in an internal list retrievable via
`getRemarkPlugins()`. `plugin` is whatever `remark().use()` accepts (a plugin function, or a
`[plugin, options]` tuple). Plugins accumulate in registration order; there is no de-duplication.

**This API is currently unused / a no-op.** The richtext widget in this package is built on Portable
Text, not a remark/markdown pipeline, and no shipped widget (richtext or otherwise) reads
`getRemarkPlugins()` to configure a markdown processor. Calling `registerRemarkPlugin` records the
plugin but has no observable effect on any widget's rendering or parsing today.

```ts
import { registerRemarkPlugin } from '@laikacms/decap-cms/core';

// Currently has no effect on any widget; the registered plugin is never consumed.
registerRemarkPlugin(myRemarkPlugin);
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
  mediaLibrary: {
    name: string,
    config?: { multiple?: boolean, max_file_size?: number },
    allow_multiple?: boolean,
  },
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

`media_library.config.max_file_size` caps uploads through the built-in media library at a size in
**bytes**. Selecting or dropping a file larger than the configured value rejects the upload before
it is persisted (`persistMedia` is never called) and shows the user an alert stating the limit in
kB. Omitting `max_file_size` (or setting it to `0`/`undefined`) applies no limit — this is the
default. The check only applies to the default upload flow in `MediaLibrary.tsx`; a custom
`registerMediaLibrary` integration is responsible for enforcing its own limit if it wants one.

```yaml
# config.yml
media_library:
  config:
    max_file_size: 5000000 # 5 MB, in bytes
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

## `registerEntryCodec`

```ts
function registerEntryCodec(pack: CmsEntryCodec): void;
```

Registers a whole-entry-file encoding (as opposed to `registerCustomFormat`, which is a simpler,
single-formatter shortcut for the same concept, or `registerRemarkPlugin`, which operates on a
single richtext field's body). Entry codecs are what `collection.format` names resolve to, and what
a file's extension is matched against to infer a format when `collection.format` isn't set. Nothing
is registered by default — the fat `@laikacms/decap-cms/app` and `@laikacms/decap-cms/laika-app`
entries register the three built-ins (`yaml`, `toml`, `json`) plus a markdown codec on startup;
`bare` consumers register only the codecs their collections actually use.

```ts
type CmsEntryCodec = {
  // Canonical format name for `collection.format` (e.g. 'yaml').
  name: string,
  // Additional accepted `collection.format` names (e.g. ['yml']).
  aliases?: string[],
  // File extensions whose format is inferred to this codec (e.g. ['yml', 'yaml']).
  fileExtensions: string[],
  // Extension used when creating new files (e.g. 'yml').
  defaultExtension: string,
  formatter: {
    fromFile(content: string): unknown,
    toFile(data: object, sortedKeys?: string[], comments?: Record<string, string>): string,
  },
  // Per-format-name formatter resolution for codecs serving several format
  // names (the markdown codec serves 'frontmatter', 'yaml-frontmatter', etc.,
  // each honoring `frontmatter_delimiter`). Falls back to `formatter`.
  getFormatter?(
    name: string,
    opts?: { customDelimiter?: string | [string, string] },
  ): CmsFormatterFunctions,
  // Format names (of this codec) that accept `frontmatter_delimiter`.
  frontmatterFormats?: string[],
  // CMS-config-file parser (config.yml and friends), for codecs that need
  // options beyond entry parsing (the yaml codec enables merge keys and
  // unlimited aliases for configs only). Falls back to `formatter.fromFile`.
  parseConfig?(text: string): unknown,
};
```

Passing a `pack` missing `name` or `formatter` logs a `console.error` and registers nothing.
Registering the same `name` twice keeps the last registration (replaces in place, doesn't append).
**Registration order matters**: the inferring `frontmatter` format tries each registered codec's
frontmatter fence language in registration order, and the first one registered becomes the default
language used when writing a new file.

```ts
import { registerEntryCodec } from '@laikacms/decap-cms/core';
import { jsonEntryCodec } from '@laikacms/decap-cms/entry-codecs/json';
import { jsonFrontmatterCodec } from '@laikacms/decap-cms/entry-codecs/json';
import { createMarkdownEntryCodec } from '@laikacms/decap-cms/entry-codecs/markdown';
import { tomlEntryCodec } from '@laikacms/decap-cms/entry-codecs/toml';
import { tomlFrontmatterCodec } from '@laikacms/decap-cms/entry-codecs/toml';
import { yamlEntryCodec } from '@laikacms/decap-cms/entry-codecs/yaml';
import { yamlFrontmatterCodec } from '@laikacms/decap-cms/entry-codecs/yaml';

registerEntryCodec(yamlEntryCodec);
registerEntryCodec(tomlEntryCodec);
registerEntryCodec(jsonEntryCodec);
// Fences are tried in the order given; yaml (`---`) becomes the default
// frontmatter language for new files.
registerEntryCodec(
  createMarkdownEntryCodec({
    frontmatter: [yamlFrontmatterCodec, tomlFrontmatterCodec, jsonFrontmatterCodec],
  }),
);
```

To write a custom codec from scratch (rather than reusing a built-in), implement
`formatter.fromFile` / `formatter.toFile` and register it the same way:

```ts
registerEntryCodec({
  name: 'my-format',
  fileExtensions: ['myext'],
  defaultExtension: 'myext',
  formatter: {
    fromFile: content => JSON.parse(content),
    toFile: data => JSON.stringify(data, null, 2),
  },
});
```

## Keyboard shortcuts

```ts
function registerShortcut(shortcut: Shortcut): () => void;
function getRegisteredShortcuts(): Shortcut[];
function subscribeToShortcuts(listener: () => void): () => void;
function suspendShortcuts(): () => void;
function isApplePlatform(): boolean;
function formatSequence(sequence: string): string[];

interface Shortcut {
  id: string;
  sequence: string;
  label: string;
  group?: string;
  when?: () => boolean;
  allowInInput?: boolean;
  allowWhileSuspended?: boolean;
  run: (event: KeyboardEvent) => void;
}
```

The global keyboard-shortcut engine, in `src/core/lib/shortcuts.ts`. App shells (`laika-app`, host
apps) register shortcuts here and the engine owns the single `window` `keydown` listener, multi-key
chord state, typing suppression, and modal coordination — core owns the mechanism, apps own the
policy. It's what `laika-app`'s command palette and shortcut-help dialog (`LaikaShortcuts.tsx`,
`LaikaShortcutHelp.tsx`) are built on.

React consumers should reach for the hooks in
[`src/core/hooks/useShortcut.ts`](./hooks/useShortcut.ts) instead of calling `registerShortcut`
directly:

```ts
function useShortcut(shortcut: Shortcut | null | undefined): void;
function useRegisteredShortcuts(): Shortcut[];
function useSuspendShortcuts(active: boolean): void;
```

```tsx
import { useShortcut } from '@laikacms/decap-cms/core';

function SaveButton({ onSave, disabled }: { onSave: () => void, disabled: boolean }) {
  useShortcut({
    id: 'entry.save',
    sequence: 'mod+s',
    label: 'Save entry',
    group: 'Editor',
    when: () => !disabled,
    run: event => {
      event.preventDefault();
      onSave();
    },
  });
  return null;
}
```

`useShortcut(null)` is a valid no-op call, so a shortcut can be disabled conditionally without
breaking the rules of hooks. `run` and `when` always see the latest render's closures without
re-registering — only changes to
`id`/`sequence`/`label`/`group`/`allowInInput`/`allowWhileSuspended` cause a re-registration.

### Sequence syntax

`sequence` is a space-separated chord of keystrokes, each keystroke a `+`-separated combo of
modifiers and a key, parsed by `parseSequence`:

- `'mod+s'` — a single keystroke with a modifier. `mod` matches **Cmd** on Apple platforms and
  **Ctrl** elsewhere (`isApplePlatform()` decides which); `cmd`, `ctrl`, and `meta` are accepted as
  aliases for `mod` and are treated identically (there is no way to require literally-Ctrl-only on
  macOS).
- `'g d'` — a two-key chord: press `g`, then `d` within `SHORTCUT_CHORD_TIMEOUT_MS` (1200ms). A
  broken chord (e.g. `g` `g` `d`) drops the stale prefix and re-reads the last key fresh, so `g d`
  still fires.
- `'?'` / `'mod+shift+p'` — `shift` is only enforced when the token asks for it; keys that already
  require Shift to type (like `?`) work without a `shift` token, and `alt`/`option` are accepted as
  aliases for each other.
- `formatSequence(sequence)` renders a sequence as display chunks per keystroke (e.g. `'mod+s'` →
  `['⌘S']` on Apple platforms, `['Ctrl S']` elsewhere) for help surfaces.

### Scoping and suspension

- **Typing suppression**: bare-key shortcuts (no `mod`) do not fire while focus is on an
  `<input>`/`<textarea>`/`<select>`/`contenteditable` element (`isEditableTarget`). A shortcut where
  every keystroke carries `mod` runs in inputs by default; `allowInInput` overrides this default
  either way.
- **Modal coordination**: keystrokes originating inside `[role="dialog"]`, `[aria-modal="true"]`, or
  `<dialog>` are ignored even without an explicit suspension, so modals that don't know about this
  engine (e.g. core's media library) are still safe.
- **`suspendShortcuts()`** pauses every shortcut except ones with `allowWhileSuspended: true` until
  the returned release function is called; it's re-entrant (each suspension must be released
  independently, and `suspendCount` tracks nesting). `LaikaDialog` calls this automatically for
  laika-app dialogs; the `useSuspendShortcuts(active)` hook wraps it for other modal surfaces.
  `allowWhileSuspended` is for toggles that must keep working from within their own dialog (e.g. the
  command palette's `mod+k` to close itself).
- **`when`** is an extra per-keystroke enablement gate evaluated on every matching keydown, checked
  after the suspension/input checks.
- **Conflicts and overrides**: registering a shortcut with an `id` that's already registered
  replaces it — this is how a host overrides an app-shell default without coordinating removal. When
  multiple eligible shortcuts share the same full sequence, the **last-registered** one wins. When
  one eligible sequence is a strict prefix of another (a chord in progress), the engine waits for
  the longer match before dispatching.
- **`attachShortcutTarget(target: Window): () => void`** routes a secondary same-origin window's
  `keydown` events through the engine — used for the editor's preview iframe, which otherwise
  swallows keystrokes so e.g. `mod+s` inside the preview pane would trigger the browser's "save
  page" instead of saving the entry.

`registerShortcut` returns a dispose function; disposing only removes the registration if it's still
the current one for that `id` (so a replacement by a host survives the original registrant's
cleanup). `subscribeToShortcuts(listener)` notifies on every register/unregister/suspend change — it
backs `useRegisteredShortcuts()` and any custom help/palette surface.

Behavior above is pinned by unit tests in
[`src/core/lib/__tests__/shortcuts.spec.ts`](./lib/__tests__/shortcuts.spec.ts) and
[`src/core/hooks/__tests__/useShortcut.spec.tsx`](./hooks/__tests__/useShortcut.spec.tsx) — treat
those as the source of truth if this section and the code ever drift.

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
`view_groups` list); you don't set `id` yourself. The index keeps ids unique even when `pattern` is
omitted (valid for `view_groups`) or repeated across entries on the same field.

### `collection.nested`

Turns a `folder` collection into a nested (tree-structured) collection, browsable by directory in
the `NestedCollection` sidebar tree instead of a flat entry list. Config keys:

- `depth` (`number`, **required**, `1`–`1000`) — maximum folder-nesting depth shown in the
  collection UI. Consumed by `collectionDepth` in [`src/core/backend.tsx`](./backend.tsx) (around
  line 320) to build the path-matching regex/rules for the collection, and takes precedence over the
  depth otherwise inferred from `collection.path` (`getPathDepth`). When the collection is also
  i18n-enabled, this depth is further adjusted by `getI18nFilesDepth`.
- `subfolders` (`boolean`, optional, default `true`) — whether entries may live in nested subfolders
  at all. When `false`, the sidebar tree in
  [`src/core/components/Collection/NestedCollection.tsx`](./components/Collection/NestedCollection.tsx)
  falls back to plain folder names for directory node titles (instead of using the title of an index
  entry inside that directory), and other nested-aware call sites (`src/core/backend.tsx`,
  `src/core/components/Collection/Entries/EntryListing.tsx`,
  `src/core/components/Collection/Entries/EntriesCollection.tsx`) treat the collection as flat for
  path-building purposes.
- `summary` (`string`, optional) — entry-summary template used for tree/list display of entries in
  this collection, overriding the collection's own `summary` for that purpose. Applied in
  `getTreeData` (`NestedCollection.tsx`), which swaps `collection.summary` for `nested.summary`
  before resolving each node's title.

```yaml
collections:
  - name: docs
    label: Docs
    folder: content/docs
    nested:
      depth: 5
      subfolders: true
      summary: '{{title}}'
    fields: [...]
```

Nested collections also change the default for `preview_path_preserve_slashes` (see
[`docs/core/preview-path.md`](../../../../docs/core/preview-path.md#preview_path_preserve_slashes)).

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

### `collection.search_fields` and advanced search

`search_fields` selects the entry field paths included in collection search. Nested paths use dot
notation. When omitted, search fields continue to be inferred from title, short-title, author, and
summary fields (or all top-level fields in a files collection).

```yaml
collections:
  - name: posts
    label: Posts
    folder: content/posts
    search_fields:
      - title
      - author.name
      - date
    fields: [...]
```

The collection search box accepts the following query forms:

- `migration guide` uses the existing case-insensitive fuzzy search.
- `"migration guide"` requires that exact phrase within one searchable field.
- `author.name:ada` limits a case-insensitive substring match to one configured field.
- `title:"migration guide"` combines a field restriction with an exact phrase.
- `date:2025-01-01..2025-12-31` applies an inclusive range. Open ranges such as `date:2025-01-01..`
  and `date:..2025-12-31` are also supported. Numeric values use numeric comparison, date-like
  values use date comparison, and other values use lexical comparison.
- Clauses may be combined with fuzzy terms, for example `author.name:ada migration`.

Advanced queries and collections with explicit `search_fields` use local search, even when a search
integration is configured, so the syntax has consistent semantics. Local search loads the selected
collections before filtering and may therefore be slower for large repositories. Ordinary fuzzy
queries on collections without `search_fields` keep using the configured integration.

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

- `local_backend: true` (the boolean shorthand) always assumes the proxy is at
  `http://localhost:8081/api/v1`, regardless of which hostname the admin UI is loaded from.
- Object form **without** `url` does _not_ default to `localhost`: the proxy address is computed by
  substituting the page's current `location.hostname` for `localhost` in the default
  (`defaultUrl.replace('localhost', location.hostname)` in `detectProxyServer`,
  `src/core/actions/config.tsx`). So loading the admin at `http://my-machine.local:8080` looks for
  the proxy at `http://my-machine.local:8081/api/v1`, not `http://localhost:8081/api/v1`. This only
  reads back as "localhost" when the admin itself is accessed from `localhost`/`127.0.0.1`.
- `url` overrides the proxy address outright, and `detectProxyServer`
  (`src/core/actions/config.tsx`) validates it before ever attempting a fetch. There are three
  distinct failure paths, each with its own console message, and the app falls back to the
  configured non-local backend in all of them:
  - A scheme other than `http:`/`https:` (e.g. `url: 'javascript:alert(1)'`) is rejected outright —
    logs `Decap CMS local_backend url must use http or https, ignoring '<url>'` — and no fetch is
    attempted.
  - A malformed URL that `new URL()` can't parse — logs
    `Decap CMS local_backend url '<url>' is not
    a valid URL` — and no fetch is attempted either.
  - Only once a syntactically valid `http(s)://` URL is actually fetched and the request fails (or
    the response isn't a recognizable Decap CMS proxy) does it log
    `Decap CMS Proxy Server not detected at '<url>'`.
- Proxy detection only runs when `location.hostname` is `localhost`, `127.0.0.1`, **or** one of the
  hostnames listed in `allowed_hosts`. `allowed_hosts` lets you develop against the local proxy from
  a hostname other than `localhost`/`127.0.0.1` (e.g. a LAN name or a tunneled domain) — and, per
  the above, that same hostname is what the object-form-without-`url` proxy address tracks.

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
the entry via the `path` field moves `_index.md` to the new subfolder but leaves `cover.jpg` where
it is.

### `publish_mode: editorial_workflow`

Top-level config option (default is `simple`, i.e. every save publishes straight to the target
branch). Validated as an enum in [`src/core/lib/validateConfig.ts`](./lib/validateConfig.ts)
(`['simple', 'editorial_workflow', '']`). Setting `publish_mode: editorial_workflow` routes entry
saves through a draft → review → publish state machine instead of publishing immediately: each save
creates or updates an "unpublished entry" that editors move between statuses (via the entry editor's
status dropdown, described below) until someone explicitly publishes it.

```yaml
publish_mode: editorial_workflow
collections:
  - name: posts
    label: Posts
    folder: content/posts
    fields: [...]
```

#### Statuses

The three statuses an unpublished entry can hold, defined in
[`src/core/constants/publishModes.ts`](./constants/publishModes.ts) (`Statuses`, with
`statusDescriptions` holding the human-readable labels used in the UI):

| Status                     | Value             | Meaning                                             |
| -------------------------- | ----------------- | --------------------------------------------------- |
| `Statuses.DRAFT`           | `draft`           | Work in progress; not yet submitted for review.     |
| `Statuses.PENDING_REVIEW`  | `pending_review`  | Submitted and waiting for a reviewer to look at it. |
| `Statuses.PENDING_PUBLISH` | `pending_publish` | Reviewed and approved; waiting to be published.     |

An unpublished entry's status lives on `entry.status` in the `editorialWorkflow` reducer state
([`src/core/reducers/editorialWorkflow.ts`](./reducers/editorialWorkflow.ts)), keyed by
`${collection}.${slug}`. `selectUnpublishedEntriesByStatus` and
`selectUnpublishedEntriesGroupedByStatus` (same file) read entries back out by status — the latter
backs the workflow board's per-column entry lists.

#### Transitions

| Trigger                                                              | Action                                                                    | Effect                                                                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor saves a new entry (`publish_mode: editorial_workflow` active) | `persistUnpublishedEntry` (`src/core/actions/editorialWorkflow.tsx`)      | Creates the entry in the `editorialWorkflow` store; the backend assigns it its initial status (`DRAFT`).                                                        |
| Editor picks a status from the entry editor's status dropdown        | `updateUnpublishedEntryStatus` (`src/core/actions/editorialWorkflow.tsx`) | Applies the new status optimistically, persists it via `backend.updateUnpublishedEntryStatus`, and rolls back to the previous status if the backend call fails. |
| Editor/reviewer clicks Publish on an entry in `PENDING_PUBLISH`      | `publishUnpublishedEntry` (`src/core/actions/editorialWorkflow.tsx`)      | Publishes the entry via `backend.publishUnpublishedEntry` and removes it from the unpublished-entries store.                                                    |
| Editor deletes an unpublished entry                                  | `deleteUnpublishedEntry` (`src/core/actions/editorialWorkflow.tsx`)       | Removes the entry from the unpublished-entries store without publishing it.                                                                                     |
| Editor unpublishes an already-published entry                        | `unpublishPublishedEntry` (`src/core/actions/editorialWorkflow.tsx`)      | Deletes the published entry and re-persists it as an unpublished entry with status `PENDING_PUBLISH`.                                                           |

The status dropdown (`renderWorkflowStatusControls` in
[`src/core/components/Editor/EditorToolbar.tsx`](./components/Editor/EditorToolbar.tsx)) only offers
`DRAFT` and `PENDING_REVIEW` directly; `PENDING_PUBLISH` is hidden when open authoring is active
(external contributors can request review but not mark an entry ready to publish).

### `i18n` (multi-locale entries)

Not to be confused with [`registerLocale`](#registerlocale) above, which registers **UI chrome**
translations (button labels, etc.). `i18n` here is entry-**content** translation: the same
collection edited in multiple locales. Settable at the config root and/or per-collection, and
schema-validated in [`src/core/lib/validateConfig.ts`](./lib/validateConfig.ts) against the enums in
[`src/core/lib/i18n.tsx`](./lib/i18n.tsx).

```yaml
# config.yml
i18n:
  structure: multiple_folders # or multiple_files / single_file
  locales: [en, de, fr]
  default_locale: en

collections:
  - name: posts
    label: Posts
    folder: content/posts
    i18n: true # inherits the root i18n block as-is
    fields:
      - { name: title, label: Title, widget: string, i18n: true }
      - { name: slug, label: Slug, widget: string, i18n: duplicate }
      - { name: author, label: Author, widget: string, i18n: false }
```

At the config root, `i18n.structure` and `i18n.locales` are **required**; `default_locale` is
optional and defaults to `locales[0]` (`defaultPreview`/config-apply logic in
`src/core/actions/config.tsx`). At the collection level, `i18n` is either a boolean (`true` inherits
the root block unchanged, `false`/omitted disables i18n for that collection) or an object with the
same three keys, letting a collection override `structure`/`locales`/`default_locale` independently
of the root.

- **`i18n.structure`** — where the JSON Schema restricts it to `Object.values(I18N_STRUCTURE)`
  (`multiple_folders`, `multiple_files`, `single_file`). Controls on-disk layout, computed by
  `getFilePath`/`getLocaleFromPath`/`normalizeFilePath` in `src/core/lib/i18n.tsx`:
  - **`multiple_folders`** — one subfolder per locale, filename unchanged:
    `content/posts/{locale}/{slug}.md` (e.g. `content/posts/de/my-post.md`). The default locale's
    file also moves under its own locale subfolder — there's no unprefixed "base" copy.
  - **`multiple_files`** — flat folder, locale appended before the extension:
    `content/posts/{slug}.{locale}.md` (e.g. `content/posts/my-post.de.md`).
  - **`single_file`** — one file for all locales; entry data is nested under
    `{ [locale]: { ...fields } }` internally to (de)serialize it into a single on-disk document.
    `getFilePaths` returns just the one un-suffixed path (`content/posts/my-post.md`), and there's
    no separate on-disk file per locale to browse.
- **`i18n.locales`** — non-empty array of locale codes (schema: 2–10 chars, `[a-zA-Z-_]+`, unique).
  One entry form tab is rendered per locale; `multiple_folders`/`multiple_files` each locale after
  the first is loaded/saved as its own backend file, merged into one in-memory entry by
  `getI18nBackup`/`groupEntries`.
- **`i18n.default_locale`** — which locale in `locales` is the "primary" one: its tab is shown
  first, its file is the one new entries are created from, and (for
  `multiple_folders`/`multiple_files`) its on-disk file is the target when other collection features
  (media library base path, slug generation from the entry, etc.) need a single canonical path. Must
  be one of `locales` — an unlisted value is simply never treated as the default (no validation
  error).

**Field-level `i18n`** (`collections[].fields[].i18n`) controls how one field behaves across
locales, checked by `isFieldTranslatable`/`isFieldDuplicate`/`isFieldHidden` in
`src/core/lib/i18n.tsx`. It only has an effect on non-default-locale tabs — the default locale's tab
always shows and edits every field regardless of this setting. Accepts a boolean or one of
`Object.values(I18N_FIELD)`:

- **`i18n: true` / `'translate'`** — field is editable independently per locale (its own value in
  each locale's tab). `true` and `'translate'` are equivalent.
- **`'duplicate'`** — field is shown but **disabled** (read-only) on non-default-locale tabs
  (`ObjectControl` passes `isDisabled: isFieldDuplicate(...)`). Its value is copied in from the
  default locale whenever the field is empty on that locale's entry (`applyDefaultI18nValues` in
  `src/core/lib/i18n.tsx`).
- **`false` / `'none'` / omitted** — field is hidden entirely on non-default-locale tabs; only the
  default locale edits it.

### Collection scope affordances

Collections may declare `view_scopes` and `edit_scopes` as arrays of OAuth-style scope strings.
Every configured scope is required. A user with the `admin` scope satisfies every requirement. When
either setting is absent or empty, that access remains unrestricted for backwards compatibility.

`view_scopes` filters collection navigation in the classic and Laika shells. `edit_scopes` hides or
disables create, save, publish, status-change, and delete affordances. These checks are UX guidance
only. They are not an authorization boundary, because a caller can invoke the API without using the
CMS interface.

### Top-level `roles`

A top-level `roles` map assigns scopes through configuration: each key is a role name, each value a
list of scope strings. A user whose backend payload carries a matching `role` gets those scopes in
addition to any `scopes` the payload itself reports (`resolveUserScopes` in
`src/core/lib/collectionAccess.ts`, read everywhere through the `useCurrentUserScopes` hook). Role
names and their scope lists are consumer data; the CMS ships no built-in roles. A user `role` that
is not defined in `roles` grants nothing and logs a one-time console warning, since it is usually a
config typo or a renamed role.

```yaml
roles:
  admin: [admin]
  editor: [content:read, content:write, media:read, media:write]
  contributor: [content:read]

collections:
  - name: posts
    view_scopes: [content:read]
    edit_scopes: [content:write]
```

Role values are checked during config normalization (`normalizeConfig` in
`src/core/actions/config.tsx`); a role whose value is not a list of strings fails config loading.
Role resolution shares the scope checks' caveat above: it is UX guidance, not an authorization
boundary.

### Top-level `field_groups`

A top-level `field_groups` map defines reusable field lists that can be referenced from anywhere a
regular field entry is allowed, via the `{ group: '<name>' }` shorthand:

```yaml
field_groups:
  seo:
    - { name: seo_title, label: 'SEO Title', widget: string, required: false }
    - { name: seo_description, label: 'SEO Description', widget: text, required: false }

collections:
  - name: posts
    label: Posts
    folder: content/posts
    fields:
      - { name: title, label: Title, widget: string }
      - { group: seo }
      - name: sections
        label: Sections
        widget: list
        fields:
          - { group: seo } # groups also work nested inside `object`/`list` fields
```

`{ group: '<name>' }` is expanded by `expandFieldGroups()` in
[`src/core/actions/config.tsx`](./actions/config.tsx) as part of `normalizeConfig`, before any other
config normalization runs — nothing downstream of that point ever sees a group reference. Expansion
is recursive: a `{ group: ... }` entry is resolved wherever it appears in a collection's or file's
top-level `fields`, and also inside the `fields` of nested `object` widgets and the
`field`/`fields`/ `types` of `list` widgets, so groups can be reused arbitrarily deep in the field
tree.

Each expansion deep-clones the group's field definitions (`cloneDeep(group)`,
`src/core/actions/config.tsx:112`), so multiple uses of the same group — across different
collections, or repeated within one collection — never share the same field objects; editing one
expanded copy (e.g. via widget defaults set at runtime) cannot affect another.

Two config errors are reported with fixed message shapes:

- Referencing an undefined group throws
  `Field group '<name>' is referenced but not defined in 'field_groups'. Available groups: <name1>, <name2>.`
  (or `... No 'field_groups' are configured.` when the map is empty).
- A group that (directly or transitively) references itself throws
  `Circular 'field_groups' reference detected: <name1> -> <name2> -> <name1>`, printing the full
  reference chain that closed the loop.

Behavior above is pinned by unit tests in
[`src/core/actions/__tests__/config.spec.ts`](./actions/__tests__/config.spec.ts) and
[`src/core/actions/__tests__/readme-field-groups.spec.ts`](./actions/__tests__/readme-field-groups.spec.ts).
