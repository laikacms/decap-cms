# Breaking Changes — Decap CMS v2.0 (Beta)

This document lists breaking changes introduced in the Decap CMS v2.0 beta release.

## Removed `window.createClass` support

`window.createClass` (the legacy React `createClass` helper) is no longer supported for registering
custom widgets or editor components.

**Migration:** Convert any class-based widgets that rely on `createClass` to **function components**
(optionally using React hooks for state and lifecycle).

```diff
- const MyControl = window.createClass({
-   getInitialState() { return { value: '' }; },
-   render() {
-     return h('input', { value: this.state.value });
-   },
- });
+ const MyControl = ({ value, onChange }) => {
+   return <input value={value} onChange={e => onChange(e.target.value)} />;
+ };
```

## Removed Sublime Text keymap for CodeMirror

The Sublime Text keymap (`keyMap: "sublime"`) is no longer bundled with the CodeMirror editor
integration.

**Migration:** If you want VS Code-style bindings, explicitly set `keyMap: vscode`. Removing the
`keyMap: sublime` setting entirely (or setting `keyMap: default`) does **not** get you the VS Code
keymap — it falls back to CodeMirror's own built-in keymap:

```diff
- keymap: sublime
+ keymap: vscode   # explicitly opt in to VS Code-style bindings
```

## Removed `PropTypes` from default exports

`PropTypes` (the legacy `prop-types` package) is no longer re-exported from the Decap CMS
default-exports bundle. Plugin authors who relied on `window.CMS.PropTypes` (e.g. for runtime prop
validation in custom widgets) must either drop the validation or import `prop-types` directly in
their plugin.

React 19 itself no longer runs PropTypes validation, so the runtime check was a no-op in modern
React anyway. We recommend migrating to TypeScript or JSDoc for prop documentation.

**Migration:**

```diff
- const { PropTypes, React } = window.CMS;
- MyControl.propTypes = { value: PropTypes.string };
+ // Drop the propTypes block, or convert the component to TypeScript / JSDoc.
```

If you must keep runtime validation:

```js
import PropTypes from 'prop-types'; // add prop-types as a direct dep
MyControl.propTypes = { value: PropTypes.string };
```

## `markdown` widget renamed to `richtext`

The Portable-Text-backed `markdown` widget is now registered as `richtext`. Persist-time
serialization still emits a markdown string, so on-disk content is unaffected. A back-compat alias
`markdown` remains registered (DCMS-483) as an indefinite compatibility shim with no scheduled
removal date; a runtime deprecation warning fires once per session the first time a `markdown` field
is resolved.

**Migration:** Rename widget names in your `config.yml`:

```diff
- { label: 'Body', name: 'body', widget: 'markdown' }
+ { label: 'Body', name: 'body', widget: 'richtext' }
```

## GraphQL client libraries are now optional peer dependencies

The GraphQL client (`@apollo/client` v4, which replaced the legacy `apollo-client`/
`apollo-cache-inmemory`/`apollo-link-http`/`apollo-link-context` stack) and `graphql`/`graphql-tag`
are no longer installed with the package. They are only needed by the GitHub and GitLab backends
when `use_graphql: true` is set, so they are now declared as optional peer dependencies and the
GraphQL API classes moved to opt-in entry points. Backends with `use_graphql` enabled throw at
authentication time if no GraphQL API is registered.

**Migration:** Only if you use `use_graphql: true` — install the peers and import the matching entry
point before `init()`:

```sh
pnpm add @apollo/client graphql graphql-tag
```

```diff
+ import { registerGitHubGraphQL } from '@laikacms/decap-cms/backends/github/graphql';
+ import { registerGitLabGraphQL } from '@laikacms/decap-cms/backends/gitlab/graphql';
  import CMS from '@laikacms/decap-cms';
+
+ registerGitHubGraphQL(); // for the GitHub backend
+ registerGitLabGraphQL(); // for the GitLab backend
```

## `ol` (OpenLayers) and the Uploadcare packages are now optional peer dependencies

`ol` is only used by the map widget, and `uploadcare-widget`/`uploadcare-widget-tab-effects` only by
the Uploadcare media library (already an opt-in subpath export). Neither is installed with the
package anymore.

**Migration:** If your config uses the `map` widget, install `ol` yourself (`pnpm add ol`) and
register the widget explicitly (DCMS-1971) — it is no longer registered by the default app entry, so
builds that bundle the root export do not require `ol` unless they opt in:

```diff
+ import { registerMapWidget } from '@laikacms/decap-cms/widgets/map';
  import CMS from '@laikacms/decap-cms';
+
+ registerMapWidget();
```

If you use the Uploadcare media library, install `uploadcare-widget` and
`uploadcare-widget-tab-effects`.

## Richtext output formats are now opt-in format packs

The `@/lib/richtext` barrel is Portable Text-only: it no longer exports the markdown/html/plaintext
mappers or any Lexical bindings, so importing `core` (as `/laika-app/bare` does) no longer drags
markdown-it and the Lexical editor into the bundle. The bundled formats moved to pack entry points —
`format-packs/markdown`, `format-packs/html`, `format-packs/plaintext` (mdx is not a format pack yet
— `src/format-packs/mdx/` only has parse/attribute helpers, no `FormatPack` export, and
`./format-packs/mdx` is explicitly blocked in `package.json#exports` until it lands) — and the
Lexical bindings (PT<->Lexical bridge, block nodes, `LexicalRichtextValue`) moved to
`lib/richtext/lexical`. The richtext widget also stopped auto-registering the markdown format at
import; it only registers the zero-cost `portableText` identity mapper. The fat `/app` and
`/laika-app` entries register markdown for you, so full-app consumers are unaffected.

**Migration:** Only if you compose from `/laika-app/bare` (or register widgets manually) and use
richtext fields with a serialized output format — register the format pack(s) your fields use before
`init()`:

```diff
  import { init, CMS } from '@laikacms/decap-cms/laika-app/bare';
  import richtextWidget from '@laikacms/decap-cms/widgets/richtext';
+ import { markdownFormat } from '@laikacms/decap-cms/format-packs/markdown';

  CMS.registerWidget(richtextWidget.Widget());
+ CMS.registerRichtextFormat(markdownFormat);
```

Fields with `format: portableText` need no pack. If you imported Lexical helpers from
`@laikacms/decap-cms/lib/richtext`, import them from `@laikacms/decap-cms/lib/richtext/lexical`
instead.

If your config also used `editor_components` to register custom Markdown block components, that key
is now a hard config error (DCMS-1974 — see "`editor_components` is now a hard config error, not a
silent no-op" below). Its replacement is `CMS.registerBlock`, which — like `registerRichtextFormat`
— must run before `init()`:

```diff
  import { init, CMS } from '@laikacms/decap-cms/laika-app/bare';
  import richtextWidget from '@laikacms/decap-cms/widgets/richtext';
  import { markdownFormat } from '@laikacms/decap-cms/format-packs/markdown';

  CMS.registerWidget(richtextWidget.Widget());
  CMS.registerRichtextFormat(markdownFormat);
+ CMS.registerBlock({
+   id: 'youtube',
+   label: 'YouTube',
+   fields: [{ name: 'videoId', label: 'Video ID', widget: 'string' }],
+   formats: {
+     markdown: {
+       pattern: /^{{< youtube (\S+) >}}/,
+       fromMatch: match => ({ videoId: match[1] }),
+       serialize: data => `{{< youtube ${data.videoId} >}}`,
+     },
+   },
+ });
```

`registerBlock` throws if `id` collides with a reserved Portable Text type (`block`, `span`, `link`,
`code`, `image`, `html`, `table`, `callout`, `list`, `horizontal-rule`, `unknown`). See the richtext
widget README's
[Custom blocks](../../../packages/decap-cms/src/widgets/richtext/README.md#custom-blocks) section
for the full `BlockDefinition` shape and the boot-time registration contract.

**Known limitation:** blocks registered with `inline: true` are markdown-serialize-only — a
`formats.markdown` codec's `serialize` runs for them, but `pattern`/`fromMatch` do not, so parsing
an inline block back out of markdown is unsupported and it is silently lost on the next load. See
[`BlockDefinition` shape](../../../packages/decap-cms/src/widgets/richtext/README.md#blockdefinition-shape)
for details.

## No import-time side effects — all registration is explicit

No module in the package registers anything at import time anymore; the only side-effect modules
left are the two composition roots (`/app` and `/laika-app` entries, which register + auto-init on
load) and the dev server CLI. Concretely:

- `app/extensions` and `laika-app/extensions` export `registerExtensions()` (idempotent) instead of
  registering on import; the fat entries call it.
- The backend GraphQL entries export `registerGitHubGraphQL()` / `registerGitLabGraphQL()` —
  importing the module alone no longer registers the API class (see the updated migration above).
- The richtext widget registers the `portableText` identity mapper when you call `Widget()`, not
  when you import the module.
- `package.json#sideEffects` now lists only the composition roots, so bundlers can tree-shake
  everything else aggressively.

**Migration:** if you imported a module purely for its registration side effect, call its exported
`register*()` function instead.

## `CmsEntryValue` removed from `lib/util`

`CmsEntryValue` (in `lib/util/types/cms/entries`) was a dead public mirror: nothing in the package
ever produced a value of that shape. It is the first deletion of the entry/domain type redesign
(DCMS-1907, see `entry-type-redesign.md`); the live entry types are `Entry`/`CompleteEntry` from the
new `lib/domain` subpath and `BackendEntry` from `lib/backend`.

**Migration:** if you imported `CmsEntryValue` for typing, switch to `Entry` (`lib/domain`) for
domain-level entry data or `BackendEntry` (`lib/backend`) for the backend seam. `EntryValue` and
`CmsEntry` (the internal engine/store types) are unaffected by this change and remain in place until
a later stage of DCMS-1907.

## Backend implementations must return `BackendEntry`, not the legacy `{ data: string }` shape

`CmsImplementation`'s entry-returning methods — `getEntry`, `entriesByFolder`, `entriesByFiles`,
`allEntriesByFolder`, `traverseCursor` — now return `BackendEntry` (`lib/backend`) instead of the
old `{ data: string, file: {...} }` shape (formerly typed as `CmsImplementationEntry`). This is
stage 3 of the entry/domain type redesign (DCMS-1907, see `entry-type-redesign.md`).
`BackendEntry.content` is a tagged union in place of the single `data` string:
`{ kind: 'raw', raw }` for text-based backends, or `{ kind: 'parsed', data }` (structured,
`Record<string, unknown>`) for backends with structured storage.

No compatibility path was kept: the engine's `toBackendEntry` normalizing branch and the
`CmsImplementationEntry`/`CmsLoadedEntry` types were deleted with this stage rather than deprecated,
so an unmigrated third-party backend fails to compile instead of being silently normalized at
runtime. All in-tree backends (github, gitlab, gitea, forgejo, bitbucket, azure, git-gateway, proxy,
local-fs, test-repo) were migrated as part of this stage. A `BackendImplementation` contract (also
published from `lib/backend`) mirrored the same shape for new backend authors going forward; the two
have since been folded together, see the next section.

**Migration:** if you maintain an out-of-tree backend, change any method that returns entries to
construct a tagged `content` union instead of a bare string:

```diff
  getEntry(path) {
    const raw = await fetchFile(path);
-   return { data: raw, file: { path } };
+   return { content: { kind: 'raw', raw }, file: { path } };
  }
```

If your backend stores structured content natively, skip the serialize/parse round trip and return
`{ kind: 'parsed', data }` directly — the engine skips its format parser for that content.

## `CmsImplementation` removed; `BackendImplementation` is the only backend contract

The backend seam had two interfaces describing the same thing: `CmsImplementation` (in
`lib/util/types/cms/backend`), which `registerBackend` actually instantiated against, and
`BackendImplementation` (published from `lib/backend`), which the entry redesign introduced as the
forward-looking contract. `CmsImplementation` and its `CmsBackendClass` constructor type are now
deleted, `registerBackend` takes `BackendClass`, and every in-tree backend declares
`implements BackendImplementation` (DCMS-1973).

This lands in 4.0 deliberately. Stage 3 above already forced a shim-less break on out-of-tree
backend authors; folding the interfaces later would have broken the same authors a second time, on
the same seam, for a change that was already known when the first break shipped.

The mirror had drifted from the live interface, so these signatures change on top of the rename:

| `CmsImplementation`                                        | `BackendImplementation`                               |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| `unpublishedEntry` returns `pullRequestAuthor?: string`    | returns `author?: Author` (`lib/domain`, re-exported) |
| `entriesByFiles(files: CmsImplementationFile[])`           | `entriesByFiles(files: BackendFileRef[])`, no `label` |
| `persistEntry(entry: CmsFileEntry, …)`                     | `persistEntry(payload: PersistPayload, …)`            |
| `getMedia`/`persistMedia` use `CmsImplementationMediaFile` | use `MediaFile`                                       |
| `authComponent(): React.ComponentType<any>`                | `authComponent(): AuthComponent`                      |

`PersistPayload` and `MediaFile` are the same shapes under published names, so those two are a
rename only. `CmsFileEntry`, `CmsImplementationFile`, `CmsUnpublishedEntry` and
`CmsUnpublishedEntryDiff` are deleted along with `CmsImplementation`.

**Migration:** import the contract from `@laikacms/decap-cms/lib/backend` and fix the three
signatures that changed shape.

```diff
- import type { CmsImplementation, CmsFileEntry, CmsImplementationFile } from '@laikacms/decap-cms/lib/util';
+ import type { BackendImplementation, PersistPayload, BackendFileRef } from '@laikacms/decap-cms/lib/backend';

- export default class MyBackend implements CmsImplementation {
+ export default class MyBackend implements BackendImplementation {

-   entriesByFiles(files: CmsImplementationFile[]) { … }
+   entriesByFiles(files: BackendFileRef[]) { … }

-   persistEntry(entry: CmsFileEntry, opts) { … }
+   persistEntry(payload: PersistPayload, opts) { … }

    async unpublishedEntry({ collection, slug }) {
      const pr = await this.api.getPullRequest(collection, slug);
-     return { …, pullRequestAuthor: pr.author.name };
+     return { …, author: { name: pr.author.name } };
    }
  }
```

`Author` carries an optional `id` and `avatarUrl` alongside the required `name`; report them if your
API gives them to you, and omit them otherwise. Nothing else moved: `authComponent` implementations
returning a real React component already satisfy `AuthComponent`, which is a structural stand-in so
that `lib/backend` stays react-free.

## `editor_components` is now a hard config error, not a silent no-op

Earlier in the beta (DCMS-1161), `editor_components` (and its `editorComponents` camelCase alias)
on a `richtext` field passed schema validation with no reader — `registry.tsx` never looked at it —
so it was silently ignored at runtime, and `setSnakeCaseConfig`'s deprecation warning for the
camelCase alias actively told users to rename to the dead snake_case key. A user migrating from
`decap-cms-widget-markdown` who followed that warning got no error and their custom Markdown block
components silently stopped existing (DCMS-1974).

`validateConfig` (`src/core/lib/validateConfig.ts`) now rejects either key on a `richtext` field
before the CMS mounts, naming `CMS.registerBlock(...)` as the replacement. `editorComponents` was
also dropped from the camelCase→snake_case `WIDGET_KEY_MAP` in `core/actions/config.tsx`, so the
normalizer no longer advises renaming to a key that only errors. This is a hard-error path, not
`additionalProperties: false` on the schema — that would reject every unknown key across every
widget, including keys legitimate third-party widgets read, which stays out of scope.

The four other legacy keys carried over from `decap-cms-widget-markdown` — `minimal`, `buttons`,
`modes`, `sanitize_preview` — remain accepted and inert (no runtime effect), but now each logs a
one-time console warning when set, since silently doing nothing is still surprising even though no
content is lost. See the richtext widget README's
[Accepted-but-inert legacy keys](../../../packages/decap-cms/src/widgets/richtext/README.md#accepted-but-inert-legacy-keys)
and [Removed keys](../../../packages/decap-cms/src/widgets/richtext/README.md#removed-keys)
sections.

**Migration:** if your config sets `editor_components` or `editorComponents` on a richtext field,
remove it and register the equivalent block(s) with `CMS.registerBlock(...)` before `init()` — see
the [Custom blocks](../../../packages/decap-cms/src/widgets/richtext/README.md#custom-blocks)
section above for the full `BlockDefinition` shape.
