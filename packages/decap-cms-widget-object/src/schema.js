export default {
  properties: {
    collapsed: { type: 'boolean' },
    i18n: {
      oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['translate', 'duplicate', 'none'] }],
    },
  },
};
