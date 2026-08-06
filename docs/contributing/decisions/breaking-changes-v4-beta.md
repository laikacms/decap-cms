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

**Migration:** Use the **VS Code** keymap instead. The VS Code keymap is now the default and does
not require additional configuration. If you were explicitly setting the keymap, update your
configuration:

```diff
- keymap: sublime
+ keymap: default   # VS Code keymap is used by default
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
removal date; a runtime deprecation warning fires once per session the first time a `markdown`
field is resolved.

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

**Migration:** If your config uses the `map` widget, install `ol` yourself (`pnpm add ol`). Note the
map widget is still registered by the default app entry, so builds that bundle the root export
currently require `ol` to be installed. If you use the Uploadcare media library, install
`uploadcare-widget` and `uploadcare-widget-tab-effects`.

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
is now inert (see the richtext widget README's "Accepted-but-inert legacy keys"). Its replacement is
`CMS.registerBlock`, which — like `registerRichtextFormat` — must run before `init()`:

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
