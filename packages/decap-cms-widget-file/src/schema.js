export default {
  properties: {
    choose_url: { type: 'boolean' },
    media_library: {
      type: 'object',
      properties: {
        allow_multiple: { type: 'boolean' },
      },
    },
  },
};
