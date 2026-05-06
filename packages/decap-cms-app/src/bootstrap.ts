/**
 * Side effects for the `decap-cms-app` browser bundle:
 *  - Logs the build version (when present on `window`).
 *  - Auto-initializes the CMS unless `window.CMS_MANUAL_INIT` is set.
 *  - Exposes `CMS`, `initCMS`, and `h` on `window` for inline templates
 *    and the unbundled CDN distribution.
 *
 * Importing this module from `index.ts` keeps the entry module's
 * top-level otherwise free of statements, so consumers see a clean
 * named-exports surface rather than a module that mixes side effects
 * with exports.
 */
import React from 'react';
import { DecapCmsCore as CMS } from 'decap-cms-core';

if (typeof window !== 'undefined') {
  if (typeof window.DECAP_CMS_APP_VERSION === 'string') {
    console.log(`decap-cms-app ${window.DECAP_CMS_APP_VERSION}`);
  }
  if (typeof window.DECAP_CMS_VERSION === 'string') {
    console.log(`decap-cms ${window.DECAP_CMS_VERSION}`);
  }

  if (window.CMS_MANUAL_INIT) {
    console.log('`window.CMS_MANUAL_INIT` flag set, skipping automatic initialization.');
  } else {
    CMS.init();
  }

  window.CMS = CMS;
  window.initCMS = CMS.init;
  window.h = window.h || React.createElement;
}
