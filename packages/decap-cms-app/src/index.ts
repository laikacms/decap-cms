import { createElement } from 'react';
import { DecapCmsCore as CMS } from 'decap-cms-core';

import './extensions.js';

// Side-effect bootstrap: run automatically on script load unless the host
// opts into manual init via `window.CMS_MANUAL_INIT`. Also expose a few CDN
// affordances on `window` so plain `<script>` users can wire up custom
// preview templates without an import step.
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
  // `h` is the React.createElement alias used by custom preview templates
  // authored in plain JS via `<script>` tags.
  window.h = window.h || createElement;
}

// Single default export, matching the documented import shape:
//   import CMS from 'decap-cms-app';
//
// The previous module mixed `export default CMS` with named `DecapCmsApp` /
// `h` exports, which triggers rolldown's `MIXED_EXPORTS` warning in the IIFE
// build because there's no unambiguous global shape. Both removed; the named
// `h` export had no consumers (the CDN affordance is `window.h` set above)
// and `DecapCmsApp` was just `{ ...CMS }`, redundant with the default.
export default CMS;
