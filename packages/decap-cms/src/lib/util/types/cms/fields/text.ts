export interface CmsFieldText {
  // This is the default widget, so declaring its type is optional.
  widget?: 'string' | 'text';
  default?: string;
  /**
   * Opts this field out of steganographic Visual Editing encoding in the preview
   * pane when set to `false`. Only takes effect when the collection has
   * `editor.visualEditing: true`; otherwise no encoding happens regardless of
   * this setting. Defaults to enabled (any value other than explicit `false`).
   */
  visualEditing?: boolean;
}
