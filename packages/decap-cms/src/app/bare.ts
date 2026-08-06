import React, { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DecapCmsCore as CMS, DecapCmsProvider } from '@/core/index';
import { App, AppContent } from './components/index';

import type { CmsConfig } from '@/core/index';

/**
 * `@laikacms/decap-cms/app/bare` — the same public API as `/app` (and the `.`
 * root export) **without** the eager import of `./extensions.js` and
 * **without** the auto-init at module load.
 *
 * Why this entry exists: the default `/app` bundles every backend (10), every
 * widget (17), every entry codec, the markdown format pack, and every locale
 * eagerly because Decap's Registry pattern needs them registered at import
 * time. For consumers deploying with a known subset — say, just GitHub + JSON
 * collections + a handful of widgets — that's a lot of wasted bytes. Importing
 * from `/bare` and calling `CMS.registerBackend(…)` / `CMS.registerWidget(…)` /
 * `CMS.registerEntryCodec(…)` only for the surfaces actually needed lets the
 * bundler tree-shake everything else. This mirrors `/laika-app/bare` for the
 * classic (non-laika) app shell.
 *
 * Usage:
 *
 *     import {
 *       init,
 *       DecapCmsApp,
 *     } from '@laikacms/decap-cms/app/bare';
 *     import { GitHubBackend } from '@laikacms/decap-cms/backends/github';
 *     import { jsonEntryCodec } from '@laikacms/decap-cms/entry-codecs/json';
 *     import widgetString from '@laikacms/decap-cms/widgets/string';
 *
 *     DecapCmsApp.registerBackend('github', GitHubBackend);
 *     DecapCmsApp.registerEntryCodec(jsonEntryCodec);
 *     DecapCmsApp.registerWidget(widgetString.Widget());
 *
 *     init();
 */

const ROOT_ID = 'nc-root';

/**
 * The default, self-contained CMS UI, and its building blocks — the routed
 * `App` layout, the render-prop layout surface (`AppContent`), and the
 * `CmsSlots` extension points deep components read via `useCmsSlots`.
 * `core` is the headless engine these compose (DCMS-251). Re-exported from
 * the side-effect-free `./components` barrel so `/bare` stays free of the
 * auto-mount-on-load behavior that `/app` adds.
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
 *
 * When using `/bare`, you are responsible for registering backends, widgets,
 * and entry-file formats via `CMS.registerBackend()` / `CMS.registerWidget()`
 * / `CMS.registerEntryCodec()` before calling `init`.
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

// Expose React.createElement as `h` for custom preview templates
export const h = createElement;

/** Re-export of core's `DecapCmsCore` (the Registry) so consumers can register their own backends/widgets. */
export { CMS };

export const DecapCmsApp = {
  ...CMS,
  init,
};

export default DecapCmsApp;
