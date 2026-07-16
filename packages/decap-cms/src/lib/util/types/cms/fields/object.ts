import type { CmsField } from '@/lib/util/types/cms/field.js';

export interface CmsFieldObject {
  widget: 'object';
  default?: unknown;

  collapsed?: boolean;
  summary?: string;
  fields: CmsField[];
}
