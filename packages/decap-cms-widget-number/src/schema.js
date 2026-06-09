export default {
  properties: {
    step: { type: 'number' },
    value_type: { type: 'string', enum: ['int', 'float'] },
    min: { type: 'number' },
    max: { type: 'number' },
  },
};
