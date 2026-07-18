# Richtext widget

The richtext widget (registered as `richtext`, with `markdown` kept as a back-compat alias — see
below) renders an emotion-styled Lexical rich-text editor. Its value is a lazy
`LexicalRichtextValue` proxy that derives Portable Text as the user types and serializes to the
field's output format only once, at file-write time.

This widget used to ship as the separate `decap-cms-widget-markdown` package. It was rebuilt on
Lexical and merged into `src/widgets/richtext/`; `markdown` is registered as an alias of `richtext`
for existing configs (`src/app/extensions.ts`).

## Config

```yaml
- { label: 'Body', name: 'body', widget: 'richtext' }
```

- `format` (optional) — output format id matched against the registered `Format` set (`markdown`,
  `html`, `plainText`). See [Format packs](#format-packs) below for what ships, which id is
  registered by default, and how to register the rest.
- `placeholder` (optional) — placeholder text shown in the editor.
- `blocks` (optional, array of strings) — allowlist of registered custom block ids available in
  this field (see `src/widgets/richtext/widget/schema.ts`). Omit to allow all registered blocks.
  This is UI-only: parsing always recognizes every registered block regardless of this allowlist.

## Format packs

A **format pack** is the Portable Text bridge for one serialized syntax — a `FormatPack` object
(`id`, a `mapper` that converts to/from Portable Text, and optional Lexical extras/blocks) exported
from `@/format-packs/*` (public subpath export, see `packages/decap-cms/package.json#exports`). The
`format` config key is matched against the id of a **registered** pack; it does nothing unless that
pack has been registered first via:

```ts
CMS.registerRichtextFormat(pack);
```

(`registerRichtextFormat` is a public method on the `CMS` object — see
`src/lib/util/types/cms/cms.tsx`; the implementation lives in `src/core/lib/registry.tsx` and
delegates to `registerFormat` in `src/lib/richtext/formats.ts`.)

Three format packs currently ship in `src/format-packs/`:

- `markdown` (`@/format-packs/markdown`, exports `markdownFormat`) — **registered automatically** at
  app bootstrap (`src/app/extensions.ts` / `src/laika-app/extensions.ts` call
  `CMS.registerRichtextFormat(markdownFormat)`). This is the only format pack available out of the
  box; `format: markdown` (or omitting `format`) works with no extra setup.
- `html` (`@/format-packs/html`, exports `htmlFormat`) — **not** auto-registered. A field with
  `format: html` has no effect until the site calls `CMS.registerRichtextFormat(htmlFormat)` itself
  (e.g. in its own `extensions.ts`/entry point).
- `plainText` (`@/format-packs/plaintext`, exports `plainTextFormat`) — note the id and export are
  camelCase `plainText`, not `plaintext` or `plain_text`. Also **not** auto-registered; requires an
  explicit `CMS.registerRichtextFormat(plainTextFormat)` before `format: plainText` has any effect.

There is no `portabletext` format pack — Portable Text is the widget's internal representation (what
every mapper converts to/from), not an output format you select via `format`.

`src/format-packs/mdx/` is not a format pack: it has no `FormatPack` export (only `attributes.ts`
and a `parse/` helper), so `format: mdx` cannot be registered against it.

## Custom blocks

A **custom block** is a PT-native replacement for the removed `editor_components` API (see
[Accepted-but-inert legacy keys](#accepted-but-inert-legacy-keys) below): a React preview plus props
edited with decap fields, stored in Portable Text as `{_type: id, _key, ...data}` and carried
through the Lexical editor as a `decap-block` / `decap-inline-block` node. Register one with:

```ts
CMS.registerBlock(definition);
```

(`registerBlock` — and `unregisterBlock` — are public methods on the `CMS` object; the
implementation lives in `src/core/lib/registry.tsx` and delegates to
`src/lib/richtext/blocks/registry.ts`.)

### `BlockDefinition` shape

```ts
interface BlockDefinition<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string; // PT `_type` and stable id — see reserved ids below
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

`BlockFieldConfig` is `{ name: string; label?: string; widget?: string; [key: string]: unknown }` —
a decap field config passed through to the widget resolver untyped.

### Reserved block ids

`registerBlock` throws if `id` collides with a PT type the mappers or Lexical bridge already give
meaning to (`RESERVED_BLOCK_TYPES` in `src/lib/richtext/blocks/registry.ts`):

```
block, span, link, code, image, html, table, callout, list, horizontal-rule, unknown
```

### Registration contract

Register blocks **at boot, before any entry is parsed**. Mappers resolve block codecs lazily, but a
`RichtextValue` parses (and caches) its content at construction — an entry loaded before a block is
registered won't recognize it. Registering after content has already been parsed or serialized logs
a one-time console warning (`"was registered after a mapper already serialized or parsed
content"`).

### Example

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

`CMS.unregisterBlock(id)` removes a block. `hasBlock(id)` and `listBlocks()` also live in
`src/lib/richtext/blocks/registry.ts` for read access (e.g. from tests), but aren't exposed on the
`CMS` object.

### Accepted-but-inert legacy keys

The field schema (`src/widgets/richtext/widget/schema.ts`) also accepts the following keys, carried
over from the pre-Lexical `decap-cms-widget-markdown` package's config surface. **None of them
currently have any runtime effect** — they pass schema validation but are not read by
`LexicalControl` or `LexicalPreview`. They're documented here so an existing config that sets them
isn't a hard error, and so nobody goes looking for behavior that isn't there:

- `minimal` (boolean) — no effect.
- `buttons` (array of strings) — no effect. In the old widget this restricted the visible toolbar
  buttons; the Lexical toolbar currently always shows its full fixed set.
- `modes` (array, enum `rich_text` / `raw`, `minItems: 1`) — no effect. In the old widget this
  controlled whether the raw-text/rich-text mode toggle was shown and which modes were available.
- `sanitize_preview` (boolean) — no effect. **This does not sanitize anything in the current
  widget** — there is no `DOMPurify` (or equivalent) call anywhere in `src/widgets/richtext/` or
  `src/lib/widgets/editor/`. Preview rendering goes through `@portabletext/react`'s `PortableText`
  component, which doesn't accept raw HTML via `dangerouslySetInnerHTML`. If you're relying on
  `sanitize_preview: false` from the old widget for any reason, be aware the behavior it gated no
  longer exists.

If you need one of these behaviors restored, file an issue against this widget rather than assuming
the config key still does what it did in `decap-cms-widget-markdown`.

### Removed keys

Unlike the keys above, `editor_components` (and its `editorComponents` camelCase alias) is not
merely inert — it isn't declared in `schema.ts` at all. The legacy editor-components API it
configured was removed along with it, so setting either key on a field config is just an unknown
property to the schema (dropped/rejected as such, not validated-but-ignored). In the old widget
this registered custom Markdown block components; that role is now filled by `CMS.registerBlock(...)`
plus the `blocks` allowlist documented in [Config](#config) above.
