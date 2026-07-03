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
    // `min`/`max` are only meaningful when `multiple: true`; when `multiple`
    // is not `true` they are simply ignored at runtime (see
    // SelectControl#isValid), so the schema allows but does not require
    // `multiple` for them (DCMS-310).
    min: { type: 'integer' },
    max: { type: 'integer' },
  },
  required: ['options'],
};
