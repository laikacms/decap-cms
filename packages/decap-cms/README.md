![Decap CMS](https://raw.githubusercontent.com/decaporg/decap-cms/main/.github/decap.svg)

# decap-cms

[![npm version](https://img.shields.io/npm/v/decap-cms.svg?style=flat)](https://www.npmjs.com/package/decap-cms)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/decaporg/decap-cms/blob/main/LICENSE)
[![core size](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdecaporg%2Fdecap-cms%2Fmain%2F.github%2Fbundle-size.json&query=%24.entries%5B%27.%2Fapp%2Fbare%27%5D.pretty&label=core%20size&color=informational)](./scripts/analyze.mjs)
[![last commit](https://img.shields.io/github/last-commit/decaporg/decap-cms?branch=main)](https://github.com/decaporg/decap-cms/commits/main)
[![dependencies](https://img.shields.io/librariesio/github/decaporg/decap-cms?label=dependencies)](https://libraries.io/github/decaporg/decap-cms)

A single-package fork of [Decap CMS](https://decapcms.org/), the open-source, Git-based CMS for
static site generators. It presents a clean UI for editing content stored in a Git repository: you
describe your content model in a YAML config, drop the CMS into the `/admin` part of your site, and
editors work against your repo through their browser.

This fork exists to keep that idea moving. All credit for the concept, the architecture, and a
decade of groundwork goes to the Decap CMS team; see [Credits](#credits) below.

## What is different from upstream

- **One package instead of a monorepo.** The former `decap-cms-*` packages live in a single
  `decap-cms` package. Each former package is exposed as a subpath export (see
  `package.json#exports`); the root export is the classic app bootstrap. Where possible,
  dependencies are declared as optional peer dependencies so you only install what your build
  actually uses, keeping install size down.

- **A modernized stack.** Base UI primitives for interactive behavior, Emotion for styling, Vitest
  and Playwright for testing, plain objects instead of Immutable.js, and an ongoing
  dependency-reduction effort.
- **Richtext.** The `markdown` widget is also available under the name `richtext`. See
  [breaking-changes-v4-beta.md](../../docs/contributing/decisions/breaking-changes-v4-beta.md) for
  the full list of breaking changes.
- **AI UI, and no AI.** The editor has an assistant panel and a "translate from &lt;locale&gt;"
  action, and the package carries no model, endpoint or AI SDK. Both render only once a host
  supplies an `LlmTransport`, through `DecapCmsProvider`'s `llm` prop or `CMS.registerLlmTransport`.
  A transport can read and patch the open draft through `LlmDocumentBridge` and nothing else. See
  [docs/contributing/decisions/architecture.md](../../docs/contributing/decisions/architecture.md)
  for where the line falls and why.
  - The older `ai-chat` widget (`decap-cms-widget-aichat`) and standalone translate action
    (`decap-cms-ai-translate`) predate this and are **deprecated**; the panel and the locale-row
    action in the CMS replace them.

## Installation

```sh
npm install decap-cms
```

The root export bootstraps the classic app. Individual parts (backends, widgets, the core engine, UI
primitives) are importable through subpath exports so you can assemble your own build.

For configuration, content modeling, and backend setup, the upstream
[Decap CMS documentation](https://www.decapcms.org/docs/intro/) applies to this fork unless noted in
[breaking-changes-v4-beta.md](../../docs/contributing/decisions/breaking-changes-v4-beta.md).

## CDN builds (no bundler)

The full app ships as a prebuilt, self-contained browser bundle at `dist/decap-cms.js`, the same
path v3 published, so unpkg and jsdelivr serve it straight off npm and existing `admin/index.html`
script tags keep resolving. Nothing else is needed: React, the backends, the widgets and the styles
are all inlined, and the bundle registers everything and calls `init()` on load.

```html
<script src="https://cdn.jsdelivr.net/npm/decap-cms@4/dist/decap-cms.js"></script>
```

The bundle is UMD, so it exposes a `DecapCms` global (and the usual `window.CMS` / `window.h`) in a
script tag and still satisfies `require('decap-cms')` in CommonJS. To register your own widgets or
preview templates before the app boots, set `window.CMS_MANUAL_INIT` to `true` before the script
tag, then call `window.initCMS()`.

An ES module build sits next to it for `<script type="module">`:

```html
<script type="module">
  import { init, CMS } from 'https://cdn.jsdelivr.net/npm/decap-cms@4/dist/decap-cms.esm.js';
</script>
```

| URL path                | Entry point     | UMD global |
| ----------------------- | --------------- | ---------- |
| `dist/decap-cms.js`     | `decap-cms/app` | `DecapCms` |
| `dist/decap-cms.esm.js` | `decap-cms/app` | -          |

`dist/decap-cms.cjs` is the same UMD build under the extension Node always reads as CommonJS (this
package is `"type": "module"`, so a `.js` file would be parsed as ESM). It is what `package.json`
points `main` and the `require` condition at; it is not meant to be fetched from a CDN.

Pin a version (`@4.0.0`) rather than a range for production. The bundle is ~5.2 MB raw and ~1.6 MB
gzipped, because a script tag can't tree-shake: every backend, widget, locale and the whole richtext
editor is included. If that matters, install the package and build against the `bare` entry
(`/app/bare`) instead, registering only what you use. The `bare` entry deliberately has no CDN
build, since a prebuilt file can't be shaken down.

Build them locally with `pnpm build:cdn`; `prepack` runs it so every published version has them. Add
`CDN_SOURCEMAP=1` for a debuggable build (the sourcemaps are ~20 MB each, so they are not
published).

## JSON Schema (editor autocompletion)

The package ships a [JSON Schema](./schema/config.schema.json) for `config.yml` at
`decap-cms/schema/config.schema.json`, so editors with
[yaml-language-server](https://github.com/redhat-developer/yaml-language-server) support (VS Code's
[YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml), most
JetBrains IDEs, etc.) can offer autocompletion and inline validation while you write `config.yml`.
Point at it with the `$schema` comment convention at the top of the file:

```yaml
# yaml-language-server: $schema=./node_modules/decap-cms/schema/config.schema.json
backend:
  name: git-gateway
collections:
  - name: posts
    label: Posts
    folder: _posts
    fields:
      - { label: Title, name: title, widget: string }
```

A CDN URL works too, if you'd rather not depend on the path to `node_modules`:

```yaml
# yaml-language-server: $schema=https://unpkg.com/decap-cms/schema/config.schema.json
```

This schema is hand-maintained to mirror the structural shape of the runtime validator
(`src/core/lib/validateConfig.ts`'s `getConfigSchema()`) — the runtime validator is still the source
of truth and the only thing that actually blocks the app from booting with a bad config. The schema
intentionally leaves field objects open (`additionalProperties` unset) since valid keys on a field
depend on its `widget`, which is only known once widgets are registered at runtime; it isn't (yet)
published to [SchemaStore](https://www.schemastore.org/), so the explicit `$schema` comment above is
required rather than automatic filename matching.

## Visual Editing (Stega)

The editor's live preview pane can steganographically encode field values (via `@vercel/stega`) so a
frontend can detect which on-page text maps back to which CMS field, the same technique used by
tools like Vercel's Visual Editing. This only changes what is rendered in the preview iframe; the
entry data saved to your repository is never touched.

Visual editing is opt-in at the collection level, with a field-level opt-out available only for
`string`/`text` widgets:

- `editor.visualEditing` (collection-level `boolean`, default `false`) enables steganographic
  encoding of the preview entry for that collection. When left unset or `false`, the preview pane
  renders the entry unmodified and no encoding happens.
- `visualEditing` (field-level `boolean`, effectively `true` once the collection has opted in). Set
  it to `false` on an individual `string` or `text` field to exclude just that field's value from
  encoding. This opt-out is only checked for `string`/`text` fields, since those are the only
  widgets ever encoded in the first place.

```yaml
collections:
  - name: posts
    label: Posts
    editor:
      visualEditing: true
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Body, name: body, widget: richtext }
      - { label: Internal Note, name: note, widget: string, visualEditing: false }
```

Only `string` and `text` widgets are encoded. Rich-text fields (`markdown`/`richtext`) are
deliberately excluded and never encoded, regardless of the collection- or field-level settings
above: their raw value is markdown source that still has to pass through the markdown ->
preview-HTML pipeline, and appending a stega block per paragraph would survive that pipeline as
literal zero-width characters sitting inside the rendered preview's prose text nodes, poisoning
copy-paste out of the preview and diverging from what a reader actually sees. All other widget types
are likewise left untouched by the encoder.

## Development

```sh
pnpm install        # Node >= 24, pnpm 9
pnpm test:ci        # lint + typecheck + unit tests
pnpm build:dev-test && pnpm serve:dev-test   # demo app on http://localhost:5174
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full workflow.

## Credits

This project is a fork of [Decap CMS](https://github.com/decaporg/decap-cms), created as Netlify CMS
by [Netlify](https://www.netlify.com/) and renamed
[in February 2023](https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/). Decap CMS is
maintained with care by [PM TechHub](https://techhub.p-m.si/) and friends; if you want to support
the original project, visit [decapcms.org](https://decapcms.org/).

Everything here builds on their work, and the Decap maintainers are welcome to adopt any part of
this fork upstream.

## Change log

This project adheres to [Semantic Versioning](http://semver.org/). Every release is documented on
the GitHub [Releases](https://github.com/decaporg/decap-cms/releases) page.

## License

Released under the [MIT License](LICENSE), retaining the original Netlify copyright.
