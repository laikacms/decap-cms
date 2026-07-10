/**
 * Clean barrel for the App layer — `App`, `AppContent`, the render-prop
 * layout surface, and the `CmsSlots` extension points deep components read
 * via `useCmsSlots`. No side effects (no backend/widget registration, no
 * auto-mount into the DOM) — safe for any consumer building its own
 * composition on top of `core` (e.g. `laika-app`, or `../index.ts`'s
 * batteries-included bundle entry, which both import from here).
 */
export { default as App, AppContent } from './App';
export type {
  AppContentProps,
  AppHeaderRenderProps,
  AppLayoutRenderProps,
  AppAuthRenderProps,
  ExtraRoute,
} from './App';
export { default as Header } from './Header';
export { default as NotFoundPage } from './NotFoundPage';
export { CmsSlotsProvider, useCmsSlots } from '../../core/lib/slots';
export type {
  CmsSlots,
  CollectionTopRenderProps,
  CollectionSidebarRenderProps,
  CollectionControlsRenderProps,
  EntryCardRenderProps,
  EntryListEmptyRenderProps,
  LoaderRenderProps,
  WorkflowCardRenderProps,
  EditorToolbarRenderProps,
  EditorViewControlsRenderProps,
  MediaLibraryCardRenderProps,
  MediaLibraryTopRenderProps,
} from '../../core/lib/slots';
