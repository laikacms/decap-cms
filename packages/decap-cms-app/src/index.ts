import { createElement } from 'react';
import { DecapCmsCore as CMS } from 'decap-cms-core';

import './extensions.js';
import './bootstrap.js';

// Expose React.createElement as `h` for custom preview templates.
export const h = createElement;

export const DecapCmsApp = {
  ...CMS,
};
