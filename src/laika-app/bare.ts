import React, { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DecapCmsCore as CMS } from '../core/index';
import LaikaApp from './LaikaApp';
import LaikaProvider from './LaikaProvider';

import type { CmsConfig } from '../core/index';

/**
 * `@laikacms/decap/laika-app/bare` — the same public API as `/laika-app`
 * **without** the eager import of `./extensions.js` and **without** the
 * auto-init at module load.
 *
 * Why this entry exists: the default `/laika-app` bundles every backend
 * (9), every widget (14), and every locale eagerly because Decap's
 * Registry pattern needs them registered at import time. For consumers
 * deploying laika with a known subset — say, just GitHub + a handful of
 * widgets — that's a lot of wasted bytes. Importing from `/bare` and
 * calling `CMS.registerBackend(…)` / `CMS.registerWidget(…)` only for the
 * surfaces actually needed lets the bundler tree-shake everything else.
 *
 * Usage:
 *
 *     import {
 *       init,
 *       LaikaCmsApp,
 *       CMS,
 *     } from '@laikacms/decap/laika-app/bare';
 *     import { GitHubBackend } from '@laikacms/decap/backend-github';
 *     import widgetString from '@laikacms/decap/widget-string';
 *
 *     CMS.registerBackend('github', GitHubBackend);
 *     CMS.registerWidget(widgetString.Widget());
 *
 *     init();
 */

const ROOT_ID = 'nc-root';

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

// Cache the React root per mount container so calling `init()` twice (HMR,
// dynamic config swaps, tests that re-mount) updates the existing root
// instead of calling `createRoot` again. The second `createRoot` on the
// same container errors with "container has already been passed to
// createRoot()" and then crashes with NotFoundError trying to clean up.
const rootRegistry = new WeakMap<Element, ReturnType<typeof createRoot>>();

function ensureRoot(container: Element): ReturnType<typeof createRoot> {
  const existing = rootRegistry.get(container);
  if (existing) return existing;
  const root = createRoot(container);
  rootRegistry.set(container, root);
  return root;
}

/**
 * Compose the Laika-styled CMS — `LaikaProvider` (theme + shell) wrapping
 * `LaikaApp` — and render it into the DOM. The provider, registry, store,
 * and content routes all come from v4.beta `core` unchanged; only the
 * chrome and theme switching are laika-flavored.
 *
 * When using `/bare`, you are responsible for registering backends + widgets
 * via `CMS.registerBackend()` / `CMS.registerWidget()` before calling `init`.
 *
 * Calling `init()` more than once reuses the same React root and re-renders,
 * so dynamic config swaps and HMR are safe.
 */
export function init(opts: { config?: CmsConfig } = {}) {
  const { config } = opts;
  const root = ensureRoot(getRoot());
  root.render(
    createElement(
      StrictMode,
      null,
      createElement(LaikaProvider, { config }, createElement(LaikaApp)),
    ),
  );
}

export const h = createElement;

/** Re-export of core's `DecapCmsCore` (the Registry) so consumers can register their own backends/widgets. */
export { CMS };

export { default as LaikaApp } from './LaikaApp';
export type { LaikaAppProps } from './LaikaApp';
export { default as LaikaHeader } from './LaikaHeader';
export { default as LaikaSidebar } from './LaikaSidebar';
export type { LaikaSidebarProps, LaikaNavItem, LaikaNavSection } from './LaikaSidebar';
export { default as LaikaLayout } from './LaikaLayout';
export { default as LaikaAuthenticationPage } from './LaikaAuthenticationPage';
export type { LaikaAuthenticationPageProps } from './LaikaAuthenticationPage';
export { default as LaikaDashboard } from './LaikaDashboard';
export { default as LaikaCollectionTop } from './LaikaCollectionTop';
export { default as LaikaEntryCard } from './LaikaEntryCard';
export { default as LaikaEmptyEntryList } from './LaikaEmptyEntryList';
export { default as LaikaLoader } from './LaikaLoader';
export { default as LaikaWorkflowCard } from './LaikaWorkflowCard';
export { default as LaikaNotifications } from './LaikaNotifications';
export { default as LaikaCollectionSearch } from './LaikaCollectionSearch';
export { default as LaikaCommandPalette } from './LaikaCommandPalette';
export { default as LaikaSettingsPage } from './LaikaSettingsPage';
export { LaikaConfigLoading, LaikaConfigError } from './LaikaBootstrapScreens';
export { default as LaikaErrorScreen } from './LaikaErrorScreen';
export { default as LaikaCollectionControls } from './LaikaCollectionControls';
export { default as LaikaEditorToolbar } from './LaikaEditorToolbar';
export { default as LaikaEditorViewControls } from './LaikaEditorViewControls';
export { default as LaikaMediaLibraryCard } from './LaikaMediaLibraryCard';
export { default as LaikaMediaLibraryTop } from './LaikaMediaLibraryTop';
export { default as LaikaNotFoundPage } from './LaikaNotFoundPage';
export { default as LaikaFooter } from './LaikaFooter';
export {
  LaikaButton,
  LaikaIconButton,
  LaikaCard,
  LaikaBadge,
  LaikaSearchInput,
  LaikaToggleSwitch,
  LaikaSpinner,
  LaikaAvatar,
  LaikaDialog,
  LaikaTooltip,
  LaikaTag,
} from './ui';
export type {
  LaikaButtonProps,
  LaikaButtonVariant,
  LaikaButtonSize,
  LaikaIconButtonProps,
  LaikaIconButtonSize,
  LaikaCardProps,
  LaikaBadgeProps,
  LaikaBadgeIntent,
  LaikaSearchInputProps,
  LaikaToggleSwitchProps,
  LaikaToggleSwitchSize,
  LaikaSpinnerProps,
  LaikaSpinnerSize,
  LaikaAvatarProps,
  LaikaAvatarSize,
  LaikaDialogProps,
  LaikaTooltipProps,
  LaikaTooltipPlacement,
  LaikaTagProps,
} from './ui';
export { default as LaikaThemeProvider, useLaikaTheme } from './LaikaThemeContext';
export type { LaikaThemeProviderProps } from './LaikaThemeContext';
export { LaikaShellProvider, useLaikaShell, LAIKA_BREAKPOINT_MOBILE } from './LaikaShellContext';
export { default as LaikaProvider } from './LaikaProvider';
export type { LaikaProviderProps } from './LaikaProvider';
export { laikaLightTheme, laikaDarkTheme, resolveTheme } from './laikaThemes';
export type { LaikaThemeMode } from './laikaThemes';
export { Icon, colors, colorsRaw, lengths, zIndex, shadows } from '../ui-default/index';

export const LaikaCmsApp = {
  ...CMS,
  init,
};

export default LaikaCmsApp;
