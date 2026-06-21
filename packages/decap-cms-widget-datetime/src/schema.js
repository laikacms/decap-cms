export default {
  properties: {
    format: { type: 'string' },
    date_format: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
    time_format: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
    picker_utc: { type: 'boolean' },
    // Deprecated camelCase aliases — normalised to snake_case at runtime
    dateFormat: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
    timeFormat: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
    pickerUtc: { type: 'boolean' },
  },
};
