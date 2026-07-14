import type { CmsFilterObj, CmsViewFilter, CmsViewGroup } from '@/lib/util/types/cms/common.js';

export type CmsFilterMap = CmsViewFilter & { active: boolean };

export type CmsFilter = Record<string, Record<string, CmsFilterMap>>; // collection.field.active

export interface CmsFieldRelation {
  widget: 'relation';
  default?: string | string[];

  collection: string;
  value_field: string;
  search_fields: string[];
  file?: string;
  display_fields?: string[];
  multiple?: boolean;
  options_length?: number;

  // Min, max amount of selected relations
  min?: number | undefined;
  max?: number | undefined;

  filters?: CmsFilter | CmsFilterObj[] | undefined;
}
