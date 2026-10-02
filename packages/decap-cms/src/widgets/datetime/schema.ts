export default {
  properties: {
    format: { type: 'string', minLength: 1 },
    date_format: { oneOf: [{ type: 'string', minLength: 1 }, { type: 'boolean' }] },
    time_format: { oneOf: [{ type: 'string', minLength: 1 }, { type: 'boolean' }] },
    picker_utc: { type: 'boolean' },
  },
  not: {
    properties: {
      date_format: { enum: [false] },
      time_format: { enum: [false] },
    },
    required: ['date_format', 'time_format'],
  },
};
