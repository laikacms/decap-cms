export interface CmsFieldAutoincrement {
  widget: 'autoincrement';
  default?: number;

  /**
   * Value assigned to the first entry created in the collection, used only
   * when no other entry already has a value for this field. Defaults to
   * `1`. Once any entry has a value, new entries get `max(existing) + 1`
   * regardless of `start`.
   */
  start?: number;
  /** Render the input read-only so editors can't hand-edit the assigned value. Defaults to `true`. */
  read_only?: boolean;
}
