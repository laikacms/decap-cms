export type CmsRichtextWidgetButton =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'heading-one'
  | 'heading-two'
  | 'heading-three'
  | 'heading-four'
  | 'heading-five'
  | 'heading-six'
  | 'quote'
  | 'code-block'
  | 'bulleted-list'
  | 'numbered-list';

/**
 * Options for the `richtext` widget. Mirrors the widget schema in
 * `@/widgets/richtext/widget/schema.ts`.
 */
export interface CmsFieldRichtext {
  widget: 'richtext';
  default?: string;

  /**
   * Output format for this rich-text field. Matched against registered mapper
   * ids (see `@/lib/richtext`): `markdown` (registered by default), plus
   * `html`, `plainText` and `portableText` when registered at call site via
   * `registerMapper(...)`.
   */
  format?: string;
  placeholder?: string;
  minimal?: boolean;
  sanitize_preview?: boolean;
  buttons?: CmsRichtextWidgetButton[];
  /**
   * Allowlist of registered block ids available in this field. Omit to allow
   * all registered blocks. UI-only: parsing always recognizes every registered
   * block.
   */
  blocks?: string[];
  modes?: ('raw' | 'rich_text')[];
}
