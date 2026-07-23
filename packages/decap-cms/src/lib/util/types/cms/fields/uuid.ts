export interface CmsFieldUuid {
  widget: 'uuid';
  default?: string;

  /** Prepended to the generated UUID, e.g. `post/`. Defaults to `''`. */
  prefix?: string;
  /** Render the input read-only so editors can't hand-edit the generated id. Defaults to `true`. */
  read_only?: boolean;
  /** Encode the UUID as lowercase, unpadded RFC 4648 Base32 instead of the canonical hex form. Defaults to `false`. */
  use_b32_encoding?: boolean;
}
