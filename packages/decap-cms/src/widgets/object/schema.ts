export default {
  properties: {
    collapsed: { type: 'boolean' },
    summary: { type: 'string' },
  },
  anyOf: [{ required: ['fields'] }, { required: ['field'] }],
};
