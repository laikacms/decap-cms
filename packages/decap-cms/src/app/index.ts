import React, { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DecapCmsCore as CMS, DecapCmsProvider } from '@/core/index';
import { App, AppContent } from './components/index';
import { registerExtensions } from './extensions.js';

// This entry is the composition root: the ONLY place (besides `laika-app`)
// where registration happens eagerly. Every other module in the package is
// side-effect free; consumers wanting a lean bundle compose from
// `/laika-app/bare` and register only what they need.
registerExtensions();

import type { CmsConfig } from '@/core/index';

const ROOT_ID = 'nc-root';

/**
 * The default, self-contained CMS UI, and its building blocks — the routed
 * `App` layout, the render-prop layout surface (`AppContent`), and the
 * `CmsSlots` extension points deep components read via `useCmsSlots`.
 * `core` is the headless engine these compose (DCMS-251). Re-exported from
 * the side-effect-free `./components` barrel — importing them from here also
 * pulls in this file's auto-mount-on-load behavior, so a consumer building
 * its own composition (like `laika-app`) should import `./components`
 * (or `@laikacms/decap/app/components`) directly instead.
 */
export { App, AppContent };
export type {
  AppAuthRenderProps,
  AppContentProps,
  AppHeaderRenderProps,
  AppLayoutRenderProps,
  ExtraRoute,
} from './components/index';
export { matchExtraRoute, matchExtraRoutePattern } from './components/index';
export type { ExtraRouteParams } from './components/index';
export { CmsSlotsProvider, Header, NotFoundPage, useCmsSlots } from './components/index';
export type {
  CmsSlots,
  CollectionControlsRenderProps,
  CollectionSidebarRenderProps,
  CollectionTopRenderProps,
  EditorToolbarRenderProps,
  EditorViewControlsRenderProps,
  EntryCardRenderProps,
  EntryListEmptyRenderProps,
  LoaderRenderProps,
  MediaLibraryCardRenderProps,
  MediaLibraryTopRenderProps,
  WorkflowCardRenderProps,
} from './components/index';

/**
 * Get (or create) the DOM element the app mounts into.
 */
function getRoot() {
  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot) {
    return existingRoot;
  }
  const newRoot = document.createElement('div');
  newRoot.id = ROOT_ID;
  document.body.appendChild(newRoot);
  return newRoot;
}

/**
 * Compose the default Decap CMS app — `DecapCmsProvider` wrapping the default
 * `App` — and render it into the DOM. This "tie it together" step previously
 * lived in `decap-cms-core`'s bootstrap; `decap-cms-core` now exports the
 * pieces (provider, components, hooks) and this package assembles them.
 */
export function init(opts: { config?: CmsConfig } = {}) {
  const { config } = opts;
  const root = createRoot(getRoot());
  root.render(
    createElement(
      StrictMode,
      null,
      createElement(DecapCmsProvider, { config }, createElement(App)),
    ),
  );
}

// Log version
if (typeof window !== 'undefined' && typeof window.DECAP_CMS_APP_VERSION === 'string') {
  console.log(`decap-cms-app ${window.DECAP_CMS_APP_VERSION}`);
}

// Expose React.createElement as `h` for custom preview templates
export const h = createElement;

export const DecapCmsApp = {
  ...CMS,
  init,
};

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

  if (typeof window.DECAP_CMS_VERSION === 'string') {
    console.log(`decap-cms ${window.DECAP_CMS_VERSION}`);
  }
}

export default DecapCmsApp;
