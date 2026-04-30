import React, { createElement } from 'react';
import { DecapCmsCore as CMS } from 'decap-cms-core';
import './extensions.js';

// Log version
if (typeof window !== 'undefined') {
  if (typeof window.DECAP_CMS_APP_VERSION === 'string') {
    console.log(`decap-cms-app ${window.DECAP_CMS_APP_VERSION}`);
  }
}

/**
 * Load Decap CMS automatically if `window.CMS_MANUAL_INIT` is set.
 */
if (typeof window !== 'undefined' && !window.CMS_MANUAL_INIT) {
  CMS.init();
} else {
  console.log('`window.CMS_MANUAL_INIT` flag set, skipping automatic initialization.');
}

// Expose React.createElement as `h` for custom preview templates
export const h = createElement;

export const DecapCmsApp = {
  ...CMS,
};

/**
 * Add extension hooks to global scope.
 */
if (typeof window !== 'undefined') {
  window.CMS = CMS;
  window.initCMS = CMS.init;
  window.h = window.h || React.createElement;
  /**
   * Log the version number.
   */
  if (typeof window !== 'undefined' && typeof window.DECAP_CMS_VERSION === 'string') {
    console.log(`decap-cms ${window.DECAP_CMS_VERSION}`);
  }
}

// export default CMS;
