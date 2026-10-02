export default {
  properties: {
    step: { type: 'number', exclusiveMinimum: 0 },
    value_type: { type: 'string', enum: ['int', 'float'] },
    min: { type: 'number' },
    max: { type: 'number' },
    slider: { type: 'boolean' },
  },
  orderedProperties: ['min', 'max'],
};
