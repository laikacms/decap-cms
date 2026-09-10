# Breaking Changes - Decap CMS v4.0 (Beta)

This document lists breaking changes introduced in the Decap CMS v4.0 beta release.

## Immutable.js is gone: every value handed to your code is a plain object

This is the widest break in v4 and the one most likely to surface as a puzzling runtime error rather
than a clear failure. v3 passed Immutable structures across every extension point: a preview
template got an `entry` you read with `entry.getIn(['data', 'title'])`, a custom widget got a
`field` you read with `field.get('name')`, and collections/fields arrived as `Map`s and `List`s. v4
uses plain objects and arrays throughout. `CmsPreviewTemplateComponentProps.entry` and
`CmsWidgetControlProps.field` are ordinary JavaScript values.

There is no compatibility shim and no runtime detection: `.get()`, `.getIn()`, `.toJS()` and
`.setIn()` simply do not exist on the values you receive, so the failure lands as
`TypeError: entry.getIn is not a function` inside your own code, naming your call site rather than
the change that caused it. A codemod is not offered either - `.get()` on a plain object is
indistinguishable from `.get()` on a `Map` without type information.

**Migration:** read properties directly, and treat lists as arrays:

```diff
- const title = entry.getIn(['data', 'title']);
+ const title = entry.data.title;

- const name = field.get('name');
+ const name = field.name;

- const values = entry.get('data').toJS();
+ const values = entry.data;

- field.get('fields').map(f => f.get('name'));
+ field.fields.map(f => f.name);
```

The rest of the Immutable API has plain equivalents: `size` is `.length`, `first()` is `[0]`,
`getIn`/`setIn` are optional chaining and object spread. If you maintain a third-party widget, note
that this break stacks with the package rename and the import-path change - see the sections below,
and expect to touch every one of them in the same pass.

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

The `markdown` widget is now registered as `richtext`. The Plate/Slate editor reads and writes a
markdown string, so on-disk content is unaffected. A back-compat alias `markdown` remains registered
(DCMS-483) as an indefinite compatibility shim with no scheduled removal date; a runtime deprecation
warning fires once per session the first time a `markdown` field is resolved.

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
+ import { registerGitHubGraphQL } from 'decap-cms/backends/github/graphql';
+ import { registerGitLabGraphQL } from 'decap-cms/backends/gitlab/graphql';
  import CMS from 'decap-cms';
+
+ registerGitHubGraphQL(); // for the GitHub backend
+ registerGitLabGraphQL(); // for the GitLab backend
```

## The AI seam is gone: no `llm` prop, no `registerLlmTransport`, no chat panel

v4.beta briefly shipped AI _UI_ and no AI: an in-editor chat panel and a "translate from
&lt;locale&gt;" action in the locale row, both dormant until a host supplied an `LlmTransport`. All
of it has been removed from the base package. Gone with it:

- `DecapCmsProvider`'s `llm` prop
- `CMS.registerLlmTransport` / `getLlmTransport` / `unregisterLlmTransport`
- the `useLlmTransport` hook exported from `decap-cms/core`
- the `LlmTransport`, `LlmSession` and `LlmDocumentBridge` types from `decap-cms/lib/util`
- the built-in `ai-chat` editor panel and `ai-translate` locale action
- the `editor.aiChat.*` and `editor.editorControlPane.i18n.translate*` locale keys

The reason is what a base release owes the people building on it. The package carried the client
half of an integration whose other half it did not ship, so every adopter paid for it and none could
use it as delivered.

The two seams the feature rode are unchanged and still public, which is the whole point: an AI panel
is now added exactly the way any other panel is.

- `CMS.registerPanel({ id, label, render })` (or `slots.editorPanels`) for the chat panel
- `CMS.registerLocaleAction({ name, render })` for the translate action, which still receives the
  resolved i18n context: `getTranslatableFields(source, target)` and `applyValue(field, value)`

**Migration:** if you passed a transport, delete the wiring and register a panel instead. Writes go
through the published `changeDraftField` action creator (exported from `decap-cms/core`), which is
the same path the old document bridge used, so an AI edit stays indistinguishable from a keystroke:

```diff
- <DecapCmsProvider config={config} llm={createMyTransport({ apiBasePath: '/api/ai' })}>
+ <DecapCmsProvider config={config}>
```

```diff
+ CMS.registerPanel({
+   id: 'assistant',
+   label: 'Assistant',
+   render: ({ collection, entry, onClose }) => <MyChatPanel entry={entry} onClose={onClose} />,
+ });
```

## `decap-cms/widgets/icon-picker` no longer exists

The subpath exported one hook, `useRovingIconFocus` (arrow-key roving focus over a grid of icons),
for the `lucide-icon` and `radix-icon` widgets. Those widgets left the repo in DCMS-1971, and the
subpath was never a widget: there is no `icon-picker` you can put in a config, and there never was.

**Migration:** if you imported the hook, copy it into your own widget. It is about forty lines with
no CMS dependencies. Config files are unaffected, since `widget: icon-picker` was never valid.

## The `aws-cognito-github-proxy` backend is no longer bundled

It encoded one organisation's auth topology (Cognito in front of a GitHub proxy) rather than a git
host, so it does not belong in the set every adopter installs. The PKCE machinery it used is
untouched and still public in `lib/auth`, and `backend.auth_type: pkce` still works on the backends
that support it.

**Migration:** if your config sets `backend.name: aws-cognito-github-proxy`, you now register the
backend yourself with `CMS.registerBackend('aws-cognito-github-proxy', YourBackend)` before
`CMS.init()`. `local-fs`, `proxy`, `git-gateway` and every git host backend are unchanged.

## The Uploadcare packages are optional peer dependencies

`uploadcare-widget`/`uploadcare-widget-tab-effects` are used only by the Uploadcare media library
(already an opt-in subpath export) and are not installed with the package.

**Migration:** if you use the Uploadcare media library, install `uploadcare-widget` and
`uploadcare-widget-tab-effects` yourself.

## No import-time side effects — all registration is explicit

No module in the package registers anything at import time anymore; the only side-effect modules
left are the two composition roots (the `/app` entry, which registers + auto-init on load) and the
dev server CLI. Concretely:

- `app/extensions` exports `registerExtensions()` (idempotent) instead of registering on import; the
  fat entries call it.
- The backend GraphQL entries export `registerGitHubGraphQL()` / `registerGitLabGraphQL()` —
  importing the module alone no longer registers the API class (see the updated migration above).
- The richtext widget's editor-component (shortcode) registry starts empty: importing the widget
  registers nothing, and components appear only through explicit `registerEditorComponent(...)`
  calls.
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

**Migration:** import the contract from `decap-cms/lib/backend` and fix the three signatures that
changed shape.

```diff
- import type { CmsImplementation, CmsFileEntry, CmsImplementationFile } from 'decap-cms/lib/util';
+ import type { BackendImplementation, PersistPayload, BackendFileRef } from 'decap-cms/lib/backend';

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

## `registerEditorComponent` is owned by the `richtext` widget, not core

v3 kept the editor-component (shortcode) registry in core: `CMS.registerEditorComponent(...)` wrote
to it and `decap-cms-widget-markdown` read it back. In v4 the registry belongs to the only thing
that consumes it. `createEditorComponent`, `registerEditorComponent`, `unregisterEditorComponent`,
`getEditorComponent` and `getEditorComponents` are exported from `decap-cms/widgets/richtext`; core
neither owns nor re-exports them, because core must not depend on a widget.

`window.CMS.registerEditorComponent(...)` still works: the app composition root (`app/bare`, which
`/app` and the CDN bundle both build on) forwards it to the widget's registry, so a v3 script-tag
shortcode registration needs no change. Only code importing the function from a module path has to
move.

**Migration:** none for `window.CMS` users. If you imported it:

```diff
- import CMS from 'decap-cms';
- CMS.registerEditorComponent({ id: 'youtube', /* … */ });
+ import { registerEditorComponent } from 'decap-cms/widgets/richtext';
+
+ registerEditorComponent({ id: 'youtube', /* … */ });
```

The component config is unchanged (`id`, `label`, `icon`, `type`, `widget`, `pattern`, `fields`,
`fromBlock`, `toBlock`, `toPreview`) except that it is a plain object rather than an
Immutable-backed value object: `fields` is an array and `fromBlock` receives a plain match array.
Registration can still happen after `init()`; the registry is handed out by reference, so an
already-mounted editor picks up a late registration.

Field keys carried over from `decap-cms-widget-markdown` behave as they did in v3: `minimal`,
`buttons`, `modes` and `editor_components` are all honored, the last one narrowing a field to the
component ids it names. `sanitize_preview` is not part of the widget schema and has no effect; like
any unknown key it passes validation silently.
