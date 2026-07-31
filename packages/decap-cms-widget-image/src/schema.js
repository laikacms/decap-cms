export default {
  properties: {
    choose_url: { type: 'boolean' },
    private: { type: 'boolean' },
    class: { type: 'string' },
    tagname: { type: 'string' },
    allow_multiple: { type: 'boolean' },
    media_library: {
      type: 'object',
      properties: {
        allow_multiple: { type: 'boolean' },
        config: { type: 'object' },
      },
    },
  },
};
