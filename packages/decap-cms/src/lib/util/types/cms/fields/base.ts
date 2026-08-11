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
