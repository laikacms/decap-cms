export default {
  properties: {
    choose_url: { type: 'boolean' },
    private: { type: 'boolean' },
    class: { type: 'string' },
    media_library: {
      type: 'object',
      properties: {
        allow_multiple: { type: 'boolean' },
        config: { type: 'object' },
      },
    },
  },
};
