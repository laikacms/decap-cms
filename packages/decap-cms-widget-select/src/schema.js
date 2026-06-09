export default {
  properties: {
    multiple: { type: 'boolean' },
    options: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string' },
          { type: 'number' },
          {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            },
            required: ['label', 'value'],
          },
        ],
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
  required: ['options'],
};
