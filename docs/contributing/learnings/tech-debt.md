# Technical Debt

## Cleanup Done

- [x] Remove jest.config.ts from decap-server (migrated to vitest)

## Import Issues

- [x] Direct source imports: `'package/src/file'` → `'package'`
- [x] Inconsistent file extensions (.ts vs .tsx) — renamed .tsx files containing no JSX to .ts

## Type Safety

- [x] Replace `Map<string, any>` with proper typed records
- [x] Remove `as unknown as` double casts in backend.tsx
- [x] Add missing @types dependencies to packages

## Dependencies

- [x] React 19 peer dependency mismatches (react-aria-menubutton, etc.)
- [x] Redux 5 peer dependency mismatches (redux-devtools-extension)
- [x] Slate version mismatches (slate-base64-serializer, slate-plain-serializer)
- [x] @iarna+toml uses unsafe eval (remove)
- [x] Entry module "packages/decap-cms/src/app/index.ts" is using named (including "DecapCmsApp",
      "default", "h") and default exports together. Resolved (DCMS-1515): adopted named-only
      exports for the composition root — `export default DecapCmsApp` removed, `DecapCmsApp`
      stays a named export alongside `App`/`AppContent`/`init`/`h`/etc.

## Architecture

- [x] Put shared types in `decap-cms-lib-util` package
- [x] Remove Immutable.js
- [x] Add ESLint rules for import patterns (see `packages/decap-cms/eslint.config.mjs` — `local/layer-deps`, `local/prefer-alias`, `import/order`)
- [x] Constants contain non-constants: packages/decap-cms-core/src/constants/configSchema.ts
- [x] Immutable.js is causing to many problems, policy is to try and avoid using it and replacing it
      with ES6 syntax (spread operator, ?. operator)

# Testing

- [x] Fix failing tests in decap-cms-core

# Richtext / Portable Text bridge

- [x] tweet/youtube converted to registry blocks (`widgets/richtext/blocks/`) with hugo-shortcode
      markdown codecs; their persist data loss is fixed (format-packs-plan.md Phase 5). Tables now
      round-trip too: structured PT `table` blocks (markdown mapper opt-in matcher + bridge cases
      both directions, Phase 6). REMAINING: `layout` (should become a `columns` block with nested
      richtext fields; its insert entries are removed for now, nodes stay registered for hydration).
      Mention/emoji/autocomplete/special-text nodes are also PT-unrepresented and still dropped at
      persist.
- [x] Custom block types now serialize through registered `formats.markdown` codecs
      (`resolveBlockCodecs`); only blocks WITHOUT a codec fall back to a warned ```json fence.
      Per-format encodings are the `BlockFormatCodec` / `FormatPack.blockSupport` API
      (format-packs-plan.md Phase 1).
- [x] Block prop edits create per-change undo entries (plain `editor.update`; `history-merge` is
      invisible to OnChangePlugin). Fixed (DCMS-1489): `BlockComponent.updateData` tags rapid
      successive edits to the same block within a coalescing window with `HISTORY_MERGE_TAG` +
      a `BLOCK_HISTORY_MERGE_TAG` marker; `Editor.tsx`'s `OnChangePlugin` handler lets the marked
      updates through to persist while still ignoring other history-merge-tagged updates (composer
      init, autocomplete ghost text).
- [ ] URL-paste auto-embed was removed with AutoEmbedPlugin (it targeted the deleted
      TweetNode/YouTubeNode). Re-implement it to insert registry blocks from pasted URLs.
- [x] Block-field validation does not gate entry save yet (EditorControl self-validates per field
      only). Fixed: `BlockForm`/`LexicalControl` now thread `onValidateObject` into the block's
      `ObjectControl` so a `required` sub-field left empty registers against the entry-level
      validation state, the same as a top-level object field's nested fields (#1442).
- [ ] Inline (`inline: true`) blocks render read-only chips in the editor (delete only); markdown
      PARSING of inline block codecs is unsupported (serialize works).
- [ ] Editor `maxLength`/`CharacterLimitPlugin` are playground leftovers (hardcoded 30).
      MaxLengthExtension is disabled (it silently deleted content past 30 chars) and
      CharacterLimitPlugin is unmounted: its OverflowNode wrapping ping-pongs forever with the
      code-highlight transform whenever a code block pushes content past the limit, freezing the tab
      (reproduced in Chrome; root-caused via composition bisect in source-toggle work). Thread a
      real per-field character limit through the widget config if wanted, and fix/report the
      overflow-vs-code-highlight loop upstream first.
- [x] `table-transformer.ts` still uses `$convertTo/FromMarkdownString` for cell content. Confirmed
      (DCMS-1987) narrow-and-document is the right call, not a migration: this file is wired ONLY
      into the Lexical `MarkdownShortcutsExtension` transformer list (live typing shortcuts in the
      contentEditable) — `lib/richtext/bridge/{lexicalToPortableText,portableTextToLexical}.ts`
      already convert tables through the normal PT `table` block shape, which goes through the same
      `formats.markdown` codec system (`resolveBlockCodecs`/`BlockFormatCodec`) as every other block.
      `BlockFormatCodec` maps PT block data to/from a markdown string for the whole-document mapper;
      it has no hook into Lexical's transformer-list API for converting a live node subtree
      mid-keystroke, so the legacy `$convertTo/FromMarkdownString` calls stay for cell content
      (comment added in table-transformer.ts explaining this).

# Ideas

- [ ] Standard Schema integration (so people can use their zod, joi, effect, etc schemas directly)
- [ ] Portable text
