export type CmsMarkdownWidgetButton =
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

export interface CmsFieldMarkdown {
  widget: 'markdown';
  default?: string;

  minimal?: boolean;
  buttons?: CmsMarkdownWidgetButton[];
  editor_components?: string[];
  modes?: ('raw' | 'rich_text')[];

  /**
   * @deprecated Use editor_components instead
   */
  editorComponents?: string[];
}
