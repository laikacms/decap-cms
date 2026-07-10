import Registry from './lib/registry';

export type * from '../lib/util/index';

/**
 * Context provider — sets up the store, config and i18n. Wrap your layout
 * (or the default `App`) with this.
 */
export { DecapCmsProvider } from './components/App/DecapCmsProvider';
export type { DecapCmsProviderProps } from './components/App/DecapCmsProvider';

/**
 * Theming — pass a `DecapTheme` to `DecapCmsProvider`'s `theme` prop, or use
 * `themeToCssVars` to emit the `--decap-*` CSS variables yourself.
 */
export { themeToCssVars } from '../ui/default/index';
export type { DecapTheme } from '../ui/default/index';

/**
 * Building blocks for assembling a custom layout. The routed `App` /
 * `AppContent` layer — plus the `CmsSlots` render-slot surface it wires up —
 * lives in `@laikacms/decap/app`, not here; `core` is the headless engine
 * they're built on (DCMS-251).
 */
export { default as Collection } from './components/Collection/Collection';
export { default as Editor } from './components/Editor/Editor';
export { default as Workflow } from './components/Workflow/Workflow';
export { default as MediaLibrary } from './components/MediaLibrary/MediaLibrary';
export { ErrorBoundary, Notifications } from './components/UI';
export type { ErrorBoundaryRenderProps } from './components/UI';

/**
 * Hooks for reading and interacting with the CMS state as a consumer.
 * Includes the typed `useAppSelector` / `useAppDispatch` for direct store
 * access, plus higher-level domain hooks (`useConfig`, `useCollection`, …).
 */
export * from './hooks';

/**
 * The raw Redux store, for interacting with CMS state outside of React.
 */
export { store } from './redux';
export type { RootState, AppDispatch } from './redux';

/**
 * The extension registry (`registerWidget`, `registerBackend`, …).
 */
export { Registry };

export const DecapCmsCore = {
  ...Registry,
};
export default DecapCmsCore;
