/**
 * Decap CMS field schema for the Lexical widget.
 *
 * Mirrors the recovered v4-era schema shape (format/placeholder/buttons/modes)
 * plus the `blocks` allowlist for registered custom blocks. The legacy
 * `editor_components` option was removed with the editor-components API;
 * register blocks via `CMS.registerBlock(...)` and (optionally) allowlist
 * them per field with `blocks`.
 */
export const lexicalEditorWidgetSchema = {
  properties: {
    format: {
      type: 'string',
      // Matched against registered mapper ids (see `@/lib/richtext`): `markdown`
      // (registered by default), plus `html`, `plainText` and `portableText`
      // when registered at call site via `registerMapper(...)`.
      description: 'Output format for this rich-text field.',
    },
    placeholder: { type: 'string' },
    minimal: { type: 'boolean' },
    sanitize_preview: { type: 'boolean' },
    buttons: {
      type: 'array',
      items: { type: 'string' },
    },
    blocks: {
      type: 'array',
      items: { type: 'string' },
      description: 'Allowlist of registered block ids available in this field. Omit to allow all '
        + 'registered blocks. UI-only: parsing always recognizes every registered block.',
    },
    modes: {
      type: 'array',
      items: { type: 'string', enum: ['rich_text', 'raw'] },
      minItems: 1,
    },
  },
} as const;
