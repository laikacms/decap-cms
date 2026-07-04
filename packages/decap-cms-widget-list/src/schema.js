export default {
  properties: {
    allow_add: { type: 'boolean' },
    allow_remove: { type: 'boolean' },
    allow_reorder: { type: 'boolean' },
    collapsed: { type: 'boolean' },
    summary: { type: 'string' },
    minimize_collapsed: { type: 'boolean' },
    label_singular: { type: 'string' },
    i18n: {
      oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['translate', 'duplicate', 'none'] }],
    },
    // `min` and `max` are independently optional (see validateMinMax in
    // decap-cms-lib-widgets) — setting one does not require the other.
    min: { type: 'integer' },
    max: { type: 'integer' },
    add_to_top: { type: 'boolean' },
    typeKey: { type: 'string' },
  },
};
