export default {
  properties: {
    step: { oneOf: [{ type: 'number' }, { type: 'string', enum: ['any'] }] },
    // Intentional: only 'int' and 'float' are supported. Unlike decapcms.org's
    // widget docs, this does NOT fall back to saving as a string for other
    // values — it fails config validation instead (see DCMS-377). This
    // matches packages/decap-cms-widget-number/README.md and the field's
    // TypeScript types (`value_type?: 'int' | 'float'`).
    value_type: { type: 'string', enum: ['int', 'float'] },
    min: { type: 'number' },
    max: { type: 'number' },
    slider: { type: 'boolean' },
  },
};
