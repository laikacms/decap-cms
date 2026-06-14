export default {
  properties: {
    minimal: { type: 'boolean' },
    buttons: { type: 'array', items: { type: 'string' } },
    editor_components: { type: 'array', items: { type: 'string' } },
    modes: { type: 'array', items: { type: 'string', enum: ['raw', 'rich_text'] } },
  },
};
