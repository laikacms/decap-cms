# Plan: Forkable richtext formats + PT-native component blocks (MDX-ready)

## Context

The richtext stack is Portable Text (PT)-centric: `src/lib/richtext` has a `Mapper`
registry (externally registerable), a markdown mapper wrapping `@portabletext/markdown`,
and a PT<->Lexical bridge that already round-trips unknown PT `_type`s generically as
`decap-block`/`decap-inline-block` nodes (`{componentId: _type, data}`). But everything
above that is unwired: `registerBlockComponent`/`BlocksProvider` have zero call sites
(custom blocks render `null`), there is no way to insert or edit blocks, `Editor.tsx`
has no extension points, and the legacy `registerEditorComponent` API is threaded through
props but never consumed by the new editor. TECH_DEBT.md already calls for playground
nodes (tweet/youtube/layout — currently *dropped at persist*, i.e. data loss) to become
config-defined blocks.

Goal: users can "fork" the markdown format — register custom formats (MDX as the proof)
and custom blocks ("Component" = React preview + serialized props edited with existing
decap widgets) — everything flowing through PT. Long-term direction: "blocks are
components are blocks" visual editing; this plan must not preclude it.

**User decisions:** foundation + MDX proof in scope; NEW block API, legacy
`editor_components` API removed (v4.beta breaking change); block props edited via an
INLINE widget form in document flow (not modal).

**Verified load-bearing facts:**
- `@portabletext/markdown` (markdown-it based) has NO parse-side custom matchers — its
  `types` option is a closed set. Custom block parsing in markdown = source pre-pass in
  our mapper. Serialize side IS open (`types` map + `unknownType`). It cannot parse MDX
  at all (JSX grammar diverges from CommonMark HTML blocks).
- `Widget.tsx` already injects `editorControl` (Redux-connected), `resolveWidget`,
  `getAsset`, `clearFieldErrors`, `onValidateObject`, `t` into EVERY widget control —
  `LexicalControl` just discards them today. The inline block form needs no new core
  plumbing.
- `ObjectControl` (`src/widgets/object/ObjectControl.tsx`) is the store-agnostic
  field-tree renderer (takes injected `editorControl`).
- Bridge drops `_key` (`portableTextToLexical.ts:70,98` `void _key`) — must be preserved
  (identity primitive for future visual editing).
- Layering (eslint `local/layer-deps`): `ui/editor` may NOT import widgets/core → block
  form renderer is injected via context from the widget layer.
- `control.tsx:69` already forwards `format={proxy.outputFormat}` to Editor.

## Architecture

Three registries in `src/lib/richtext` (shared lib, importable everywhere):

1. **Mapper registry** — exists, unchanged.
2. **Block registry** (new, `blocks/registry.ts`): `BlockDefinition` keyed by PT `_type`:
   ```ts
   interface BlockDefinition<TData extends BlockData = BlockData> {
     id: string;                      // PT _type; reserved ids rejected ('block','span','code','image',...)
     label?: string; icon?: ReactNode;
     inline?: boolean;                // decap-inline-block instead of block-level
     fields: BlockFieldConfig[];      // decap field configs (untyped passthrough)
     defaultData?: TData | (() => TData);
     keywords?: string[];             // slash-menu search
     preview?: ComponentType<BlockPreviewProps<TData>>;  // editor + preview pane
     editableRegions?: string[];      // RESERVED for visual editing (v1 ignores)
     formats?: { markdown?: BlockFormatCodec<TData>; [formatId: string]: unknown };
   }
   interface BlockFormatCodec<TData> {   // markdown-style codec
     pattern: RegExp;                    // matched at line boundaries; may be multiline
     fromMatch(m: RegExpMatchArray): TData;
     serialize(data: TData): string;
   }
   ```
   API: `registerBlock/unregisterBlock/getBlock/listBlocks/hasBlock`,
   `resolveBlockCodecs(formatId)` (lazy, consulted by mappers at call time — no
   rebuild-on-registration; contract: register at boot, before entries load; dev-mode
   warn if registered after first parse).
3. **Format registry** (new, `formats.ts`): a `FormatPack`:
   ```ts
   interface FormatPack {
     id: string; label?: string;
     mapper: Mapper | ((ctx: { resolveCodecs(): Map<string, BlockFormatCodec> }) => Mapper);
     lexical?: { nodes?, transformers?, insertOptions?: EditorInsertOption[] };  // stable identity
     blocks?: BlockDefinition[];      // bundled blocks
     blockSupport?: {                 // pack-owned encodings
       codecs?: Record<string, BlockFormatCodec>;          // per-block overrides
       encodeBlock?(def, value): string;                   // generic fallback (MDX: emit JSX)
     };
   }
   registerFormat(pack) / unregisterFormat / getFormat / listFormats
   ```
   Codec resolution at serialize: block's own `formats[id]` → pack `codecs[blockId]` →
   pack `encodeBlock` → library fallback (markdown: console.warn + json fence).

**Editor wiring — props-in, context-down.** `Editor.tsx` gains
`extensions?: FormatLexicalExtras` (merged into hardcoded node/transformer lists inside
the AppExtension useMemo) and `blocksConfig?: BlocksConfig` `{blocks, getAsset,
renderBlockForm?, renderBlockChrome?}`. `BlocksProvider` wraps `LexicalExtensionComposer`
(decorators are portal-rendered inside the composer tree → context works).
`BlockNode.decorate()` → new `BlockComponent` (reads context; **resolver function**, not
closed registry — reserves `registerBlockComponents(map)` for site-supplied real
components in visual-editing v2). Delete module-global `registerBlockComponent`.

**Block UX.** Default chrome (`src/ui/editor/editor-ui/BlockChrome.tsx`): bordered card
in document flow — label/icon header, edit/delete; body = `definition.preview` or
fallback; UNKNOWN componentId renders a read-only chip (name + collapsed data, delete
allowed, data preserved — never null). Click → select node + `isEditing`; inline form
renders beneath the preview in document flow (plain React DOM inside the decorator, so
typing never touches contentEditable selection). `updateData` = `editor.update(() =>
node.setData(next), {tag: 'history-merge'})`; discrete tag on close for one undo step.
Inline (`inline:true`) blocks: chip + anchored expansion; may ship read-only-with-delete
in v1 if fragile. Insertion: slash-menu options generated from the block map (new
`plugins/picker/BlockPickerPlugin.tsx` + `$insertBlock(def)` helper in
`lib/richtext/blocks/insert.ts`) + a generated toolbar group; de-duplicate the two
copy-pasted picker lists in Editor.tsx into `useBasePickerOptions()` while there.

**Inline block form** (`src/widgets/richtext/widget/BlockForm.tsx`): mounts
`ObjectControl` with `field={{fields: def.fields}}` and the injected Redux-connected
`editorControl` (accepted: editor always runs inside the app; the coupling stays behind
the injected `renderBlockForm` seam so a standalone mounter can replace it later).
`LexicalControl` stops discarding the injected props and passes
`extensions={getFormat(proxy.outputFormat)?.lexical}` +
`blocksConfig={{blocks: resolveBlocksForField(field), getAsset, renderBlockForm}}`.

**Nested richtext inside blocks = PT arrays** (reconciled decision): block `data` values
may be PT arrays; `children` is the conventional JSX-children prop. `normalizeBlockData`
coerces a nested `RichtextValue` to its `.portableText` (NOT a serialized string — string
coercion was rejected: PT arrays are canonical, required by MDX children and visual
editing). The richtext control must accept a PT-array initial value (identity mapper
path). Markdown container codecs serialize children by recursively invoking the format's
mapper. This directly supports the dev-test `container-richtext` demo.

**Preview pane**: `widget/preview.tsx` builds `@portabletext/react` `components.types`
from registered block previews; unknownType → subtle placeholder.

**Markdown mapper becomes codec-aware** (`createMarkdownMapper(resolveCodecs)`):
- `toPortableText`: source pre-pass — scan with codec patterns (line-boundary anchored,
  earliest match wins), split into md/block segments, parse md segments via
  `markdownToPortableText` (shared deterministic keyGenerator), splice
  `{_type: id, _key, ...fromMatch(m)}` objects. Inline-block *parsing* in markdown is a
  documented v1 limitation (serialize works).
- `fromPortableText`: `types` map from `resolveBlockCodecs('markdown')` +
  `unknownType` = warn + json fence.
- Add a negative probe: cap markdown `detect()` at 0.8 when unambiguous MDX probes match.
- `widget/index.ts`: `registerFormat(markdownFormat)` replaces `registerMapper(...)`.

**Public API** (`core/lib/registry.tsx` + CMS type): `CMS.registerBlock`,
`CMS.unregisterBlock`, `CMS.registerRichtextFormat` (name avoids collision with existing
`registerCustomFormat`), reserved no-op `CMS.registerBlockComponents`. REMOVE
`registerEditorComponent`/`getEditorComponents`.

## MDX format pack (`src/format-packs/mdx/`, new subpath `./format-packs/mdx`, lazy opt-in)

Asymmetric hybrid:
- **Parse**: `mdast-util-from-markdown` (already a dep) + `micromark-extension-mdx-jsx`,
  `micromark-extension-mdx-expression`, `micromark-extension-mdx-md`, `mdast-util-mdx-jsx`,
  `mdast-util-mdx-expression` (+ gfm pair). NO acorn, NO `@mdx-js/mdx`, no ESM micromark
  ext in v1 (import/export detected by post-pass on paragraph source slices → opaque
  `mdx-esm` blocks). Local `mdastToPortableText.ts` (~400-600 lines, bounded tree walk)
  emits the SAME PT dialect as the markdown mapper — pinned by golden parity tests
  (pure-markdown corpus: mdxMapper PT deep-equals markdownMapper PT).
- **Serialize**: reuse `portableTextToMarkdown` + local `emitJsx.ts`; `unknownType`
  renderer emits ANY unknown PT object as JSX → lossless fallback, nothing ever degrades
  to json fences in MDX.

PT conventions: capitalized JSX names map DIRECTLY to `_type` (`<YouTube id="x"/>` →
`{_type:'YouTube', _key, id:'x'}`; registering a `YouTube` block later upgrades existing
docs with zero migration). Lowercase/dotted/fragments → opaque `{_type:'mdx-jsx', value}`;
expressions → `{_type:'mdx-expression', value}`; ESM → `{_type:'mdx-esm', value}` — all
read-only chips, verbatim round-trip. JSX children → `children: [PT blocks]` prop.
Attributes: quoted→string, shorthand→true, expression→strict `JSON.parse` attempt else
`{_type:'mdx-expression'}` wrapper; never eval. Block id ↔ JSX name override via
`formats.mdx.name`. `detect()`: MDX probes (import/export lines, capitalized tags, flow
expressions, `={`); no hits → markdownScore*0.95 so the field hint decides.

Ships with: `dev-test/config.yml` `mdx_pages` collection (`extension: mdx`,
`format: mdx` body), fixtures, `playwright/mdx.e2e.ts`.

## Phases (each independently shippable; DCMS-nnn commits)

1. **`feat(lib-richtext): block + format registries; codec-aware markdown mapper`**
   New: `blocks/registry.ts`, `blocks/resolve.ts`, `blocks/serializeData.ts`,
   `blocks/insert.ts`, `formats.ts`. Reshape `blocks/types.ts` (delete
   `CmsEditorComponentLike`). Rework `markdown-mapper.ts` (factory + pre-pass + negative
   probe). Also: preserve `_key` through the bridge (both directions). Update
   `index.ts` exports. Tests: registry semantics/reserved ids, shortcode round-trip
   (incl. multiline container), key determinism, `_key` round-trip, existing bridge tests
   green. Zero behavior change with no blocks registered.
2. **`feat(ui-editor): block rendering, insertion, extension props`**
   `Editor.tsx` (props, BlocksProvider, node/transformer merge, picker de-dup via
   `editor-hooks/useBasePickerOptions.tsx`, toolbar block group),
   `plugins/picker/BlockPickerPlugin.tsx`, `editor-ui/BlockChrome.tsx`; lib:
   `blocks/BlockComponent.tsx`, decorate() rewrite, delete `registerBlockComponent`.
   Tests: preview-from-context, unknown-block chip (not null), picker generation,
   `$insertBlock`, form survives decorator re-render (focus retention).
3. **`feat(widget-richtext): inline block prop forms + preview-pane blocks`**
   `widget/control.tsx` (accept injected props, thread extras/blocksConfig),
   `widget/BlockForm.tsx` (ObjectControl + injected editorControl),
   `widget/preview.tsx` (types map), `widget/schema.ts` (drop `editor_components`, add
   `blocks: string[]` allowlist), `widget/index.ts` (registerFormat). PT-array initial
   value support in control/`normalizeBlockData`. Tests: form commits normalized data
   (RichtextValue→PT array), preview renders block, allowlist filters picker not parsing.
4. **`feat(core)!: CMS.registerBlock/registerRichtextFormat; remove editor_components`**
   registry.tsx, `cms.tsx` types, `common.ts` types, threading removal in
   EditorControl/Widget/EditorPreviewPane/EditorPreviewContent, delete
   `core/valueObjects/EditorComponent.tsx` + `src/editor-component-image/`, clean
   app/laika-app extensions, port dev-test demos (youtube shortcode block,
   container-markdown/container-richtext with nested richtext fields), BREAKING_CHANGES
   entry. **Operator approval: remove `./editor-component-image` export from
   package.json.**
5. **`feat(widget-richtext): youtube/tweet as registry blocks; drop hardcoded embeds`**
   `widgets/richtext/blocks/{youtube,tweet}.tsx` (previews ported from
   YouTubeNode/TweetNode; default hugo-style markdown codecs, user-overridable), register
   in extensions; delete TweetNode/YouTubeNode/embed plugins/TWEET transformer/embed
   picker entries; remove layout insert entries (keep nodes registered for hydration;
   follow-up ticket: `columns` block). Fixes tweet/youtube persist data loss. e2e:
   insert → edit inline → save → shortcode in output → reload renders.
6. **`fix(lib-richtext): table bridge support`** (optional; closes TECH_DEBT item)
   Table cases in both bridge files matching @portabletext/markdown's `table` PT shape.
7. **`feat(format-packs): MDX format pack`**
   `src/format-packs/mdx/{index,mdx-mapper,parse/fromMdx,parse/mdastToPortableText,
   serialize/toMdx,serialize/emitJsx,attributes}.ts` + tests (parity corpus, round-trip
   idempotence, attributes matrix, detect, unknown components). `mdx` in
   `core/formats/formats.tsx` extension maps. dev-test collection + Playwright e2e.
   **Operator approval: new deps (micromark/mdast mdx cluster, ~40-70KB gz on the lazy
   path) + `./format-packs/mdx` subpath in package.json.** Add to bundle-size tracking.
   **Hard prerequisite: the in-flight frontmatter fix must make the body opaque
   (split/join, no markdown reparse) — otherwise .mdx bodies get mangled at the format
   layer before the mapper ever sees them.**

## Visual-editor trajectory (kept open, not built now)

v1 = chips/previews (this plan) → v2 = `registerBlockComponents(map)` renders real
site-bundled components in an error boundary, `children` as nested editable region →
v3 = preview pane becomes the editing surface (sandboxed iframe/portal + postMessage,
`editableRegions` consumed). Affordances already baked in above: resolver-function
component lookup, PT-array props + `children` convention, `_key` preservation,
`editableRegions` reserved field, single block-render seam, descriptors (not React
components) in FormatPack picker entries. Security: content is never evaluated
(no acorn, strict JSON.parse only); v2 executes only site-bundled code (same trust
domain as `registerPreviewTemplate`).

## Implementation notes (deviations from the original plan)

- Phase 1: `resolveBlockCodecs` lives in `src/lib/richtext/formats.ts` (not
  `blocks/registry.ts`) to avoid a module cycle; the block registry exposes
  `collectBlockOwnCodecs(formatId)` and the format registry layers pack
  overrides beneath it (a block's own codec wins).
- Phase 2: block prop edits commit as PLAIN (untagged) `editor.update` calls.
  The planned `history-merge` tag is invisible to `OnChangePlugin` (its
  `ignoreHistoryMergeTagChange` defaults to true), so tagged edits never
  reached the persist path; flipping that flag would make initial hydration
  fire onSerializedChange and mark entries dirty on open. Trade-off:
  per-change undo entries for block prop edits. Follow-up: custom history
  coalescing for block forms.
- Phase 5: the Playwright e2e (insert block via slash menu, edit inline, save,
  verify shortcode) is DEFERRED: the worktree currently carries another
  agent's in-flight editor work (useEditor.ts, MarkdownTogglePlugin/
  source-toggle) with real runtime errors, so an e2e run would fail on
  unrelated breakage. Run it once the tree stabilizes, together with the
  `verify` skill demo check.
- Phase 5: lucide-react has no brand icons; youtube uses VideoIcon, tweet
  MessageCircleIcon.
- Phase 2: the shared picker list is `plugins/picker/basePickerOptions.tsx`
  (a plain function, not the planned `editor-hooks/useBasePickerOptions` -
  it holds no state, and hook naming would trigger hook lint rules).

## Operator-approval queue (gated files; needs Sem)

Phase 4 shipped with these follow-ups parked on gated files:

1. `package.json`: remove the `./editor-component-image` export subpath, then
   delete `src/editor-component-image/` (kept on disk so the export stays
   buildable meanwhile; nothing imports it anymore and its type is inlined).
2. `BREAKING_CHANGES_V2_BETA.md` (constitutional doc): add the entry below.

   > ### `registerEditorComponent` / `editor_components` removed
   > The string/regex-based editor-components API is gone. Custom blocks are
   > now PT-native: register them with `CMS.registerBlock({id, label, fields,
   > preview, defaultData, formats: {markdown: {pattern, fromMatch,
   > serialize}}})`. Blocks are stored in Portable Text as
   > `{_type: id, _key, ...data}` and edited inline in the editor with regular
   > decap widgets. Per-field availability moved from `editor_components` to
   > the richtext widget's `blocks: [ids]` allowlist. Custom richtext formats
   > register via `CMS.registerRichtextFormat({id, mapper, lexical?, blocks?,
   > blockSupport?})`. `CMS.registerBlockComponents` is reserved (no-op) for
   > the upcoming visual editor. The `./editor-component-image` export is
   > deprecated and no longer registered.

3. Phase 7 (MDX pack) will additionally need: new deps
   (`micromark-extension-mdx-jsx`, `micromark-extension-mdx-expression`,
   `micromark-extension-mdx-md`, `mdast-util-mdx-jsx`,
   `mdast-util-mdx-expression`, gfm pair if not hoisted) and a
   `./format-packs/mdx` subpath export.

## Risks / open items

- Decorator re-render vs form focus: mitigated (stable component type, local state,
  history-merge); verify in Phase 2 test + Phase 5 e2e; fallback commit-on-blur.
- MDX round-trip formatting churn (markers/quoting normalize on first save): golden
  idempotence tests + release note; verify RichtextValue laziness means untouched
  fields never re-serialize.
- Boot-order contract for registration (dev warn as guard).
- Block-field validation doesn't gate entry save in v1 (follow-up).
- Inline-block editing UX may ship read-only in v1.
- Two markdown parsers produce PT (markdown-it for md, micromark for mdx): parity corpus
  is the contract; re-run on @portabletext/markdown upgrades.

## Verification

- Per phase: colocated Vitest specs (import from 'vitest'); `pnpm test:ci` (lint +
  typecheck + test) before declaring done.
- Demo: `pnpm build:demo && pnpm serve:dev-test` → http://localhost:5174; use the
  `verify` skill for browser checks (insert youtube block via `/`, edit id inline, save,
  inspect persisted markdown in the test-repo backend; repeat for mdx_pages collection).
- e2e: extend `playwright/` (`pnpm test:e2e`) — Phase 5 block flow, Phase 7 mdx flow.
- Operator-gated files (package.json, tsconfig, eslint.config, .github): listed items
  need Sem's explicit approval before those phases start.
