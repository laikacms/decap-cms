export interface CmsFieldNumber {
  widget: 'number';
  default?: string | number;

  value_type?: 'int' | 'float' | string;
  min?: number;
  max?: number;

  step?: number;

  /**
   * Render a range slider alongside the numeric input. Requires `min` and
   * `max` to be meaningful; when either is unset, the slider falls back to
   * a 0-100 range.
   */
  slider?: boolean;

  /**
   * @deprecated Use valueType instead
   */
  valueType?: 'int' | 'float' | string;
}
