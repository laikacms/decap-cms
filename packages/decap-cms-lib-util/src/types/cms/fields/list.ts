import type { CmsField } from '../field.js';
import type { CmsFieldBase } from './base.js';
import type { CmsFieldObject } from './object.js';

export interface CmsFieldList {
  widget: 'list';
  default?: unknown;

  allow_add?: boolean;
  allow_remove?: boolean;
  allow_reorder?: boolean;
  collapsed?: boolean;
  summary?: string;
  minimize_collapsed?: boolean;
  label_singular?: string;
  field?: CmsField;
  fields?: CmsField[];
  max?: number;
  min?: number;
  add_to_top?: boolean;
  types?: (CmsFieldBase & CmsFieldObject)[];
}
