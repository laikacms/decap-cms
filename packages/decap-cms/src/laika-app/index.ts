import React from 'react';

import { init, LaikaCmsApp } from './bare';
// Eagerly register every backend, widget, editor-component, and locale. Apps
// that want a smaller bundle can import from `@laikacms/decap-cms/laika-app/bare`
// instead and pick only the registrations they actually need. This entry is a
// composition root — the only kind of module allowed to run registrations at
// load; everything else in the package is side-effect free.
import { registerExtensions } from './extensions.js';

registerExtensions();

if (typeof window !== 'undefined' && typeof window.DECAP_CMS_APP_VERSION === 'string') {
  console.log(`laika-cms-app ${window.DECAP_CMS_APP_VERSION}`);
}

if (typeof window !== 'undefined') {
  if (!window.CMS_MANUAL_INIT) {
    init();
  } else {
    console.log('`window.CMS_MANUAL_INIT` flag set, skipping automatic initialization.');
  }

  window.CMS = LaikaCmsApp;
  window.initCMS = init;
  window.h = window.h || React.createElement;
}

// Re-export everything from `./bare` so `@laikacms/decap-cms/laika-app` keeps its
// public API. The only differences vs `./bare`: this entry also calls
// `registerExtensions()` for eager Registry registration and runs `init()`
// automatically when loaded in a browser.
export * from './bare';
export { default } from './bare';
