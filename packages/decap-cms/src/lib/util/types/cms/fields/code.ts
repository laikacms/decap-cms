export interface CmsFieldCode {
  widget: 'code';
  default?: unknown;

  default_language?: string;
  allow_language_selection?: boolean;
  keys?: { code: string, lang: string };
  output_code_only?: boolean;
}
