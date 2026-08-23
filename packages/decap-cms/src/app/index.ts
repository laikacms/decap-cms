import React from 'react';

import { DecapCmsApp, init } from './bare';
// Eagerly register every backend, widget, entry codec, format, and locale.
// Apps that want a smaller bundle can import from `decap-cms/app/bare`
// instead and pick only the registrations they actually need. This entry is a
// composition root — the only kind of module allowed to run registrations at
// load; everything else in the package is side-effect free.
import { registerExtensions } from './extensions.js';

registerExtensions();

if (typeof window !== 'undefined') {
  /**
   * Load Decap CMS automatically unless `window.CMS_MANUAL_INIT` is set.
   */
  if (!window.CMS_MANUAL_INIT) {
    init();
  } else {
    console.log('`window.CMS_MANUAL_INIT` flag set, skipping automatic initialization.');
  }

  /**
   * Add extension hooks to global scope.
   */
  window.CMS = DecapCmsApp;
  window.initCMS = init;
  window.h = window.h || React.createElement;
}

// Re-export everything from `./bare` so `decap-cms` (and its `./app`
// alias) keeps its public API. The only differences vs `./bare`: this entry
// also calls `registerExtensions()` for eager Registry registration and runs
// `init()` automatically when loaded in a browser.
export * from './bare';
export { default } from './bare';
