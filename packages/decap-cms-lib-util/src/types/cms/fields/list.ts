import type { CmsField } from "../field";
import type { CmsFieldBase } from "./fields-common";
import type { CmsFieldObject } from "./object";

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
