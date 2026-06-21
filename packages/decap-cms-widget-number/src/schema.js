export default {
  properties: {
    step: { oneOf: [{ type: 'number' }, { type: 'string', enum: ['any'] }] },
    value_type: { type: 'string', enum: ['int', 'float'] },
    min: { type: 'number' },
    max: { type: 'number' },
  },
};
