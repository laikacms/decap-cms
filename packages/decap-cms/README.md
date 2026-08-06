![Decap CMS](/.github/decap.svg)

# @laikacms/decap-cms

[![npm version](https://img.shields.io/npm/v/@laikacms/decap-cms.svg?style=flat)](https://www.npmjs.com/package/@laikacms/decap-cms)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/laikacms/decap-cms/blob/main/LICENSE)

A single-package fork of [Decap CMS](https://decapcms.org/), the open-source, Git-based CMS for
static site generators. It presents a clean UI for editing content stored in a Git repository: you
describe your content model in a YAML config, drop the CMS into the `/admin` part of your site, and
editors work against your repo through their browser.

This fork exists to keep that idea moving. All credit for the concept, the architecture, and a
decade of groundwork goes to the Decap CMS team; see [Credits](#credits) below.

## What is different from upstream

- **One package instead of a monorepo.** The former `decap-cms-*` packages live in a single
  `@laikacms/decap-cms` package. Each former package is exposed as a subpath export (see
  `package.json#exports`); the root export is the classic app bootstrap.
- **The Laika UI.** Alongside the classic Decap app shell there is a new shell with a dashboard,
  command palette, and mobile support.
- **A modernized stack.** Base UI primitives for interactive behavior, Emotion for styling, Vitest
  and Playwright for testing, plain objects instead of Immutable.js, and an ongoing
  dependency-reduction effort.
- **Richtext on Portable Text.** The `markdown` widget is replaced by a `richtext` widget backed by
  the Portable Text editor. See [BREAKING_CHANGES_V4_BETA.md](../../BREAKING_CHANGES_V4_BETA.md) for
  the full list of breaking changes.
- **AI chat.** A document-scoped `ai-chat` widget streams assistant replies and can apply proposed
  edits back onto the current entry's draft fields; see
  [src/widgets/aichat/README.md](./src/widgets/aichat/README.md) for widget setup. The server side
  is powered by `decapAi()` from the `@laikacms/decap-cms/ai` subpath export, which bundles the
  Vercel AI SDK (model provider factories, `tool`/`jsonSchema` re-exports) so consumers share one
  `ai` runtime instead of installing it themselves; see [src/ai/index.ts](./src/ai/index.ts) for
  usage.

## Installation

```sh
npm install @laikacms/decap-cms
```

The root export bootstraps the classic app. Individual parts (backends, widgets, the core engine, UI
primitives) are importable through subpath exports so you can assemble your own build.

For configuration, content modeling, and backend setup, the upstream
[Decap CMS documentation](https://www.decapcms.org/docs/intro/) applies to this fork unless noted in
[BREAKING_CHANGES_V4_BETA.md](../../BREAKING_CHANGES_V4_BETA.md).

If you use the `laika` backend, read [src/backends/laika/README.md](./src/backends/laika/README.md)
first — it diverges from the upstream backend docs in three ways that aren't obvious from the
standard config reference:

- **It requires the `laika-app` entry point, not the root import above.** The root export
  (`@laikacms/decap-cms`, what plain `npm install @laikacms/decap-cms` gives you) never calls
  `CMS.registerBackend('laika', …)`, so setting `backend: { name: laika }` against it fails silently
  at runtime (no registered backend, no editor). Import `@laikacms/decap-cms/laika-app` instead (or
  `@laikacms/decap-cms/laika-app/bare` to register only the pieces you use) — see
  [src/backends/laika/README.md#usage](./src/backends/laika/README.md#usage) for the exact import.
- **Only `format: json` collections are supported.** Decap's default (markdown-frontmatter) is not
  yet supported; omitting `format:` now fails fast client-side with an actionable error before any
  request reaches the server.
- **Entry locking is not yet implemented.** The advisory "Being edited by X" locking that Decap core
  supports (`getEntryLock`/`acquireEntryLock`/`releaseEntryLock`/`refreshEntryLock`) has no effect
  on this backend yet.

## JSON Schema (editor autocompletion)

The package ships a [JSON Schema](./schema/config.schema.json) for `config.yml` at
`@laikacms/decap-cms/schema/config.schema.json`, so editors with
[yaml-language-server](https://github.com/redhat-developer/yaml-language-server) support (VS Code's
[YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml), most
JetBrains IDEs, etc.) can offer autocompletion and inline validation while you write `config.yml`.
Point at it with the `$schema` comment convention at the top of the file:

```yaml
# yaml-language-server: $schema=./node_modules/@laikacms/decap-cms/schema/config.schema.json
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
# yaml-language-server: $schema=https://unpkg.com/@laikacms/decap-cms/schema/config.schema.json
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

Only `string` and `text` widgets are encoded. `richtext` fields (including their legacy `markdown`
alias) are deliberately excluded and never encoded, regardless of the collection- or field-level
settings above: their raw value is markdown source that still has to pass through the markdown ->
Portable Text -> preview-HTML pipeline, and appending a stega block per paragraph would survive that
pipeline as literal zero-width characters sitting inside the rendered preview's prose text nodes —
poisoning copy-paste out of the preview and diverging from what a reader actually sees. All other
widget types are likewise left untouched by the encoder.

## Development

```sh
pnpm install        # Node >= 20, pnpm 9
pnpm test:ci        # lint + typecheck + unit tests
pnpm build:dev-test && pnpm serve:dev-test   # demo app on http://localhost:5174, Laika UI on /laika.html
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
the GitHub [Releases](https://github.com/laikacms/decap-cms/releases) page.

## License

Released under the [MIT License](LICENSE), retaining the original Netlify copyright.
