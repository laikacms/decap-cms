import type { CmsField } from '../field.js';

export interface CmsFieldObject {
  widget: 'object';
  default?: unknown;

  collapsed?: boolean;
  summary?: string;
  fields: CmsField[];
}
