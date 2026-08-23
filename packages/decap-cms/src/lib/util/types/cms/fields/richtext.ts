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
 * Options for the `richtext` widget. Mirrors the rich-text widget's own config
 * schema, which is the source of truth.
 */
export interface CmsFieldRichtext {
  widget: 'richtext';
  default?: string;

  placeholder?: string;
  minimal?: boolean;
  sanitize_preview?: boolean;
  buttons?: CmsRichtextWidgetButton[];
  /** Ids of editor components registered with `CMS.registerEditorComponent`. */
  editor_components?: string[];
  modes?: ('raw' | 'rich_text')[];
}
