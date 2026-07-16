---
name: decap-portable-text
description: Author valid Portable Text for Decap CMS richtext fields (the Lexical rich-text bridge). Use when writing, generating, or transforming rich-text field values for a Decap/Laika CMS site, via MCP tools, the CLI, or direct file edits.
---

# Portable Text authoring for the Decap rich-text bridge

The `richtext` widget stores its value through a Portable Text bridge
(`@laikacms/decap-cms/lib/richtext`). Whatever the on-disk format (markdown, html, portableText),
the canonical in-memory model your content must map to is a **Portable Text document**: a top-level
JSON array where every element is an object with a string `_type`. That is the only hard validation;
everything else in this skill is about avoiding silent data loss on round-trip through the editor.

## Block shapes

Text block (`_type: "block"`):

```json
{
  "_type": "block",
  "_key": "b0",
  "style": "normal",
  "markDefs": [],
  "children": [{ "_type": "span", "_key": "s0", "text": "Body", "marks": [] }],
  "listItem": "bullet",
  "level": 1
}
```

- `style`: one of `normal`, `blockquote`, `h1`..`h6`. Anything else silently degrades to `normal` on
  round-trip.
- `children`: array of spans. `markDefs`: array of annotation objects, `[]` when none.
- `listItem` and `level` appear only on list items (see Lists below).

Span (`_type: "span"`): `{ "_type": "span", "text": string, "marks": string[] }`.

Code block (`_type: "code"`): `{ "_type": "code", "code": string, "language": string | null }`. Code
is its own top-level type, not a custom block.

Any other `_type` is a **custom block** (see below).

## Marks: decorators vs annotations

Each string in `span.marks` is either:

- a **decorator**: bare formatting, exact supported set: `strong`, `em`, `strike-through`,
  `underline`, `code`, `sub`, `sup`, `highlight`. Stack them freely:
  `"marks": ["strong", "em", "code"]`.
- an **annotation reference**: the `_key` of an entry in the block's `markDefs`. Links work this
  way:

```json
{
  "_type": "block",
  "style": "normal",
  "markDefs": [{ "_type": "link", "_key": "m0", "href": "https://example.com" }],
  "children": [
    { "_type": "span", "text": "see ", "marks": [] },
    { "_type": "span", "text": "here", "marks": ["m0"] }
  ]
}
```

Rules that bite:

- `markDefs[]._key` is **required** and the span must reference that exact key, or the link is
  dropped.
- A mark string that is neither a known decorator nor a matching markDef key silently disappears.
- Only `href` survives the editor round-trip on links; `rel`, `target`, `title` are read but not
  re-emitted.

## Keys (`_key`)

Optional on blocks and spans, required on markDefs. The bridge generates counter-based keys (`b0`,
`b1` for blocks, `s0` for spans, `m0` for markDefs) so round-trips are byte-stable. When authoring,
either omit block/span keys or use the same convention; never duplicate keys within one scope.

## Lists

Emit list items as a **flat run of sibling blocks**, each with `listItem` (`bullet` or `number`,
nothing else is recognized) and a 1-based `level`. Do not nest arrays:

```json
[
  {
    "_type": "block",
    "style": "normal",
    "listItem": "bullet",
    "level": 1,
    "markDefs": [],
    "children": [{ "_type": "span", "text": "one", "marks": [] }]
  },
  {
    "_type": "block",
    "style": "normal",
    "listItem": "bullet",
    "level": 2,
    "markDefs": [],
    "children": [{ "_type": "span", "text": "one-a", "marks": [] }]
  },
  {
    "_type": "block",
    "style": "normal",
    "listItem": "number",
    "level": 1,
    "markDefs": [],
    "children": [{ "_type": "span", "text": "two", "marks": [] }]
  }
]
```

Consecutive list blocks are grouped by `level`; a marker change at the same level starts a new
sibling list.

## Custom blocks and editor components

There is no built-in image type. Any block whose `_type` is not `block` or `code` is carried as a
generic embedded block (`decap-block` in the editor) and round-trips **losslessly**: `_type` becomes
the component id, all other fields (minus `_key`) become its data.

```json
{ "_type": "image", "src": "/photo.png", "alt": "A photo" }
```

To target a registered editor component (shortcode/embed), set `_type` to the component's registered
`id` and put its field values as sibling keys on the block object. An unregistered `_type` still
parses and is preserved, it just renders as an unknown block in the editor. If an entire document
fails to hydrate, the editor falls back to an empty document with a console warning rather than
crashing, so malformed values can look like silent content loss: validate shape before writing.

## Field configuration and storage format

```yaml
- name: body
  widget: richtext
  format: portableText   # optional; also: markdown (default), html, plainText
```

- The stored value is a string; a mapper converts it to/from Portable Text. **Only the `markdown`
  mapper is registered by default.** To store raw Portable Text JSON, the site must register the
  identity mapper at setup:

```ts
import { portableTextMapper, registerMapper } from '@laikacms/decap-cms/lib/richtext';
registerMapper(portableTextMapper);
```

- `format` values are matched against mapper ids: `markdown`, `html`, `plainText`, `portableText`
  (camelCase, exactly).
- With `format: portableText` the stored string is `JSON.stringify` of the document array, and the
  only validation is "array of objects that each have a string `_type`". Non-array JSON or elements
  missing `_type` are rejected.
- An empty document normalizes to a single empty `normal` block.

## Pitfall checklist before writing a value

- [ ] Top level is an array; every element has a string `_type`.
- [ ] Block styles limited to `normal`, `blockquote`, `h1`..`h6`.
- [ ] Decorators only from the supported set; annotations reference an existing `markDefs._key`.
- [ ] List items are flat sibling blocks with `listItem` + `level`.
- [ ] Custom block `_type` matches a registered editor component id when you want it editable, and
      its data fields match that component's `fields`.
- [ ] No reliance on link `rel`/`target`/`title` surviving edits.
