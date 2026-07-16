export interface CmsFieldString {
  // This is the default widget, so declaring its type is optional.
  widget?: 'string' | 'text';
  default?: string;
  visualEditing?: boolean;
}
