export default {
  properties: {
    allow_input: { type: 'boolean' },
    enable_alpha: { type: 'boolean' },
    // Deprecated camelCase aliases — normalised to snake_case at runtime
    // (see ColorControl.js) and documented in the README's "Deprecated
    // aliases" section.
    allowInput: { type: 'boolean' },
    enableAlpha: { type: 'boolean' },
  },
};
