export default {
  properties: {
    collection: { type: 'string' },
    value_field: { type: 'string' },
    search_fields: { type: 'array', minItems: 1, items: { type: 'string' } },
    file: { type: 'string' },
    multiple: { type: 'boolean' },
    display_fields: { type: 'array', minItems: 1, items: { type: 'string' } },
    options_length: { type: 'integer' },
    optionsLength: { type: 'integer' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          values: { type: 'array', minItems: 1, items: { type: ['string', 'boolean', 'number'] } },
        },
        required: ['field', 'values'],
      },
    },
    // `min`/`max` are only meaningful when `multiple: true`; when `multiple`
    // is not `true` they are simply ignored at runtime (see
    // RelationControl#isValid), so the schema allows but does not require
    // `multiple` for them (DCMS-310).
    min: { type: 'integer' },
    max: { type: 'integer' },
  },
  oneOf: [
    {
      required: ['collection', 'value_field', 'search_fields'],
    },
    {
      required: ['collection', 'valueField', 'searchFields'],
    },
  ],
};
