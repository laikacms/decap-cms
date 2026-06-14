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
          values: { type: 'array', minItems: 1, items: { type: ['string', 'boolean', 'integer'] } },
        },
        required: ['field', 'values'],
      },
    },
  },
  if: {
    properties: { multiple: { const: true } },
    required: ['multiple'],
  },
  then: {
    properties: {
      min: { type: 'integer' },
      max: { type: 'integer' },
    },
  },
  else: {
    not: {
      anyOf: [{ required: ['min'] }, { required: ['max'] }],
    },
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
