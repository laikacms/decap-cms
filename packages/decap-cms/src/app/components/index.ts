/**
 * Clean barrel for the App layer — `App`, `AppContent`, the render-prop
 * layout surface, and the `CmsSlots` extension points deep components read
 * via `useCmsSlots`. No side effects (no backend/widget registration, no
 * auto-mount into the DOM) — safe for any consumer building its own
 * composition on top of `core` (e.g. `laika-app`, or `../index.ts`'s
 * batteries-included bundle entry, which both import from here).
 */
export { default as NotFoundPage } from '@/core/components/NotFoundPage';
export { CmsSlotsProvider, useCmsSlots } from '@/core/lib/slots';
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
} from '@/core/lib/slots';
export { matchExtraRoute, matchExtraRoutePattern } from '@/core/routing/extraRoutes';
export type { ExtraRouteParams } from '@/core/routing/extraRoutes';
export { AppContent, default as App } from './App';
export type {
  AppAuthRenderProps,
  AppContentProps,
  AppHeaderRenderProps,
  AppLayoutRenderProps,
  ExtraRoute,
} from './App';
export { default as Header } from './Header';
