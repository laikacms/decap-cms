import type { StandardSchemaV1 } from '@/lib/util/types/cms/standardSchema';

export interface CmsFieldBase {
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
  pattern?: [string | RegExp, string];
  i18n?: boolean | 'translate' | 'duplicate' | 'none';
  media_folder?: string;
  public_folder?: string;
  comment?: string;
  /**
   * Opt-in field-level validation via any Standard Schema-compliant validator
   * (zod, valibot, arktype, effect Schema, ...), see
   * https://github.com/standard-schema/standard-schema. When set, this schema's
   * `~standard.validate` issues become the field's error output, in place of
   * (not in addition to) the built-in `required`/`pattern` checks. Fields that
   * don't set `validate` keep the existing widget validation DSL unchanged.
   */
  validate?: StandardSchemaV1<unknown, unknown>;

  /**
   * When set, this field's value must be unique across every other entry in
   * the same collection (the entry being saved is excluded from the
   * comparison). Checked at save time, in addition to (not in place of) the
   * `required`/`pattern`/`validate` checks. Widget-agnostic - doesn't require
   * the `slug`/`meta` field machinery. See DCMS-1422 (partial).
   */
  unique?: boolean;

  // For nested fields
  allow_remove?: boolean;
  allow_reorder?: boolean;
}

export interface CmsFieldMeta {
  name: string;
  label: string;
  widget: string;
  required: boolean;
  index_file?: string;
  meta: boolean;
}
