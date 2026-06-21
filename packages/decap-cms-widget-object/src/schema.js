export default {
  properties: {
    collapsed: { type: 'boolean' },
    summary: { type: 'string' },
    i18n: {
      oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['translate', 'duplicate', 'none'] }],
    },
  },
};
