export default {
  properties: {
    allow_add: { type: 'boolean' },
    allow_remove: { type: 'boolean' },
    allow_reorder: { type: 'boolean' },
    collapsed: { type: 'boolean' },
    summary: { type: 'string' },
    minimize_collapsed: { type: 'boolean' },
    label_singular: { type: 'string' },
    label_plural: { type: 'string' },
    i18n: {
      oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['translate', 'duplicate', 'none'] }],
    },
    // `min` and `max` are independently optional (see validateMinMax in
    // decap-cms-lib-widgets) — setting one does not require the other.
    min: { type: 'integer' },
    max: { type: 'integer' },
    add_to_top: { type: 'boolean' },
    typeKey: { type: 'string' },
    // `field`, `fields`, and `types` each select a different item structure
    // for the list (see ListControl#getValueType): `field` for a single-field
    // list, `fields` for a multi-field (object) list, `types` for a
    // variable/typed list. The nested field shape itself is recursively
    // validated by the top-level config schema (decap-cms-core); here we only
    // constrain the shape at the list-widget level.
    field: { type: 'object' },
    fields: { type: 'array', minItems: 1, items: { type: 'object' } },
    types: {
      type: 'array',
      minItems: 1,
      items: { type: 'object', required: ['name'] },
    },
  },
  // A list item's structure must come from exactly one of `field` (single
  // field), `fields` (multiple fields), or `types` (variable/typed items).
  // Setting more than one is a misconfiguration: ListControl silently
  // prefers `fields` over `field` over `types`, ignoring the rest. Setting
  // none is valid — it renders a plain list of simple values.
  not: {
    anyOf: [
      { required: ['field', 'fields'] },
      { required: ['field', 'types'] },
      { required: ['fields', 'types'] },
    ],
  },
};
