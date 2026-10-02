export default {
  orderedProperties: ['min', 'max'],
  properties: {
    multiple: { type: 'boolean' },
    min: { type: 'integer', minimum: 0 },
    max: { type: 'integer', minimum: 0 },
    options: {
      type: 'array',
      uniqueOptionValues: true,
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
  required: ['options'],
};
