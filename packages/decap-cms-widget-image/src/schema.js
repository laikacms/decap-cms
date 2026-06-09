export default {
  properties: {
    media_library: {
      type: 'object',
      properties: {
        allow_multiple: { type: 'boolean' },
        choose_url: { type: 'boolean' },
        config: { type: 'object' },
      },
    },
    choose_url: { type: 'boolean' },
    private: { type: 'boolean' },
  },
};
