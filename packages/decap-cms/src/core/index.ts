import Registry from './lib/registry';

export type * from '@/lib/util/index';

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
export { themeToCssVars } from '@/ui/default/index';
export type { DecapTheme } from '@/ui/default/index';

/**
 * Building blocks for assembling a custom layout. The routed `App` /
 * `AppContent` layer — plus the `CmsSlots` render-slot surface it wires up —
 * lives in `@laikacms/decap-cms/app`, not here; `core` is the headless engine
 * they're built on (DCMS-251).
 */
export { default as Collection } from './components/Collection/Collection';
export { default as Editor } from './components/Editor/Editor';
export { default as MediaLibrary } from './components/MediaLibrary/MediaLibrary';
export { ErrorBoundary, Notifications } from './components/UI';
export type { ErrorBoundaryRenderProps } from './components/UI';
export { default as Workflow } from './components/Workflow/Workflow';

/**
 * Routing — the `Router` port a consumer can implement to drive navigation
 * through their own history mechanics (the URL scheme is the separate
 * `routing` table axis), and `createDefaultRouter` for composing the default
 * hash router explicitly (as the laika shell does).
 */
export { createDefaultRouter } from './routing/defaultRouter';
export type { DefaultRouter } from './routing/defaultRouter';
export { defaultRoutingTable, matchRoute } from './routing/router';
export type {
  RouteMatch,
  Router,
  RouterAction,
  RouterBlocker,
  RouterLocation,
  RouterTransition,
  RouterUpdate,
} from './routing/router';
export type { Route, RouteParams, RoutingTable } from './routing/table';

/**
 * Hooks for reading and interacting with the CMS state as a consumer.
 * Includes the typed `useAppSelector` / `useAppDispatch` for direct store
 * access, plus higher-level domain hooks (`useConfig`, `useCollection`, …).
 */
export * from './hooks';

/**
 * Global keyboard shortcuts — app shells and hosts register their own
 * shortcuts into one engine so chords, typing suppression, modal
 * coordination, and help listings stay coherent. React consumers usually
 * want the `useShortcut` / `useRegisteredShortcuts` hooks instead.
 */
export {
  formatSequence,
  getRegisteredShortcuts,
  isApplePlatform,
  registerShortcut,
  subscribeToShortcuts,
  suspendShortcuts,
} from './lib/shortcuts';
export type { Shortcut, ShortcutKeystroke } from './lib/shortcuts';

/**
 * The raw Redux store, for interacting with CMS state outside of React.
 */
export { store } from './redux';
export type { AppDispatch, RootState } from './redux';

/**
 * Supported action creators for reading and mutating entries and the open
 * draft. The store above has always been public, but the vocabulary for
 * driving it was not: an extension had to reverse-engineer reducer contracts
 * and hand-roll raw action objects. Dispatch these instead.
 *
 * ```ts
 * import { changeDraftField, store } from '@laikacms/decap-cms/core';
 *
 * store.dispatch(changeDraftField({ field, value, metadata: {}, entries: [] }));
 * ```
 *
 * These are the entry/draft actions the CMS itself uses; anything not listed
 * here stays internal and may change without a major version.
 */
export {
  addDraftEntryMediaFile,
  changeDraftField,
  changeDraftFieldValidation,
  clearFieldErrors,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  deleteEntry,
  discardDraft,
  loadEntries,
  loadEntry,
  persistEntry,
  removeDraftEntryMediaFile,
} from './actions/entries';

/**
 * The (singleton) Backend wrapper for the configured backend. Hosts that make
 * their own API calls with the CMS identity should get the token through
 * `currentBackend(store.getState().config).getToken()` rather than reading
 * stored tokens directly — `getToken()` is refresh-aware, and refresh grants
 * ROTATE the token pair, so a second independent refresher would revoke the
 * backend's session (and vice versa).
 */
export { currentBackend } from './backend';

/**
 * The extension registry (`registerWidget`, `registerBackend`, …).
 */
export { Registry };

/**
 * The LLM seam. The CMS ships AI UI (chat panel, translate action) and no
 * transport: supply one through `DecapCmsProvider`'s `llm` prop, or
 * `Registry.registerLlmTransport` when props cannot reach (injecting into an
 * already-compiled bundle). With no transport, no AI UI renders.
 *
 * `useLlmTransport` is exported so host-supplied UI can drive the same
 * conversation the built-in panel does.
 */
export { useLlmTransport } from './lib/llm';

/**
 * The JSON Schema validator the engine runs a widget's `schema` through when
 * validating a config. Public so an extension author shipping a widget schema
 * can assert it against the same validator the CMS will use, rather than a
 * hand-rolled approximation.
 */
export { validateJSONSchema } from './lib/jsonSchemaValidator';
export type { JSONSchema, SchemaError } from './lib/jsonSchemaValidator';

export const DecapCmsCore = {
  ...Registry,
};
export default DecapCmsCore;
