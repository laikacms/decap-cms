import type { CmsFilterObj, CmsViewFilter, CmsViewGroup } from '@/lib/util/types/cms/common.js';

export type CmsFilterMap = CmsViewFilter & { active: boolean };

export type CmsFilter = Record<string, Record<string, CmsFilterMap>>; // collection.field.active

export interface CmsFieldRelation {
  widget: 'relation';
  default?: string | string[];

  collection: string;
  // `value_field`/`search_fields` and their camelCase equivalents are
  // equally valid per the JSON schema's `oneOf` (schema.ts) and README; one
  // of each pair is required, so both are typed optional here (DCMS-1458).
  value_field?: string;
  valueField?: string;
  search_fields?: string[];
  searchFields?: string[];
  file?: string;
  // `display_fields`/`options_length` and their camelCase equivalents are
  // equally valid per the JSON schema's `oneOf` (schema.ts) and README, same
  // as `value_field`/`search_fields` above (DCMS-1903).
  display_fields?: string[];
  displayFields?: string[];
  multiple?: boolean;
  options_length?: number;
  optionsLength?: number;

  // Min, max amount of selected relations
  min?: number | undefined;
  max?: number | undefined;

  filters?: CmsFilter | CmsFilterObj[] | undefined;

  // Opt-in "quick add" (DCMS-1421): when set, the relation control offers a
  // "+ Create new" affordance that opens a minimal-fields form for
  // `collection` and, on save, creates the entry and selects it as this
  // field's value - without leaving the current editor. Off by default.
  allow_quick_add?: boolean;
  allowQuickAdd?: boolean;
}
