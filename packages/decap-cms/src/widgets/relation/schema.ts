export default {
  properties: {
    collection: { type: 'string' },
    value_field: { type: 'string' },
    valueField: { type: 'string' },
    search_fields: { type: 'array', minItems: 1, items: { type: 'string' } },
    searchFields: { type: 'array', minItems: 1, items: { type: 'string' } },
    file: { type: 'string' },
    multiple: { type: 'boolean' },
    min: { type: 'integer', minimum: 0 },
    max: { type: 'integer', minimum: 0 },
    display_fields: { type: 'array', minItems: 1, items: { type: 'string' } },
    displayFields: { type: 'array', minItems: 1, items: { type: 'string' } },
    options_length: { type: 'integer', minimum: 1 },
    optionsLength: { type: 'integer', minimum: 1 },
    allow_quick_add: { type: 'boolean' },
    allowQuickAdd: { type: 'boolean' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          values: { type: 'array', minItems: 1, items: { type: ['string', 'boolean', 'integer'] } },
        },
        required: ['field', 'values'],
      },
    },
  },
  orderedProperties: ['min', 'max'],
  required: ['collection'],
  allOf: [
    {
      anyOf: [{ required: ['value_field'] }, { required: ['valueField'] }],
    },
    {
      anyOf: [{ required: ['search_fields'] }, { required: ['searchFields'] }],
    },
  ],
};
