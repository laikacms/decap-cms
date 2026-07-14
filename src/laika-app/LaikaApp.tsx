import React from 'react';

import { App as DefaultApp } from '@/app/components/index';
import LaikaHeader from './LaikaHeader';
import LaikaLayout from './LaikaLayout';
import LaikaAuthenticationPage from './LaikaAuthenticationPage';
import LaikaDashboard from './LaikaDashboard';
import LaikaCollectionTop from './LaikaCollectionTop';
import LaikaEntryCard from './LaikaEntryCard';
import LaikaEmptyEntryList from './LaikaEmptyEntryList';
import LaikaLoader from './LaikaLoader';
import LaikaWorkflowCard from './LaikaWorkflowCard';
import LaikaNotifications from './LaikaNotifications';
import LaikaCollectionControls from './LaikaCollectionControls';
import LaikaEditorToolbar from './LaikaEditorToolbar';
import LaikaEditorViewControls from './LaikaEditorViewControls';
import LaikaMediaLibraryCard from './LaikaMediaLibraryCard';
import LaikaMediaLibraryTop from './LaikaMediaLibraryTop';
import LaikaNotFoundPage from './LaikaNotFoundPage';
import LaikaFooter from './LaikaFooter';
import LaikaSettingsPage from './LaikaSettingsPage';
import { LaikaConfigLoading, LaikaConfigError } from './LaikaBootstrapScreens';
import LaikaErrorScreen from './LaikaErrorScreen';

import type {
  AppAuthRenderProps,
  AppContentProps,
  AppHeaderRenderProps,
  AppLayoutRenderProps,
  CmsSlots,
  CollectionControlsRenderProps,
  CollectionTopRenderProps,
  EditorToolbarRenderProps,
  EditorViewControlsRenderProps,
  EntryCardRenderProps,
  EntryListEmptyRenderProps,
  ExtraRoute,
  LoaderRenderProps,
  MediaLibraryCardRenderProps,
  MediaLibraryTopRenderProps,
  WorkflowCardRenderProps,
} from '@/app/components/index';
import type { ErrorBoundaryRenderProps } from '@/core/index';

/**
 * Drop-in replacement for the default Decap `App`. Composes core's `App`
 * with the full set of laika slots — top-level (header, layout, auth, root)
 * plus deep slots (collection top via `slots` context). Everything else
 * (router, error boundary, content routing, media library) keeps coming
 * from v4.beta core.
 */
const slots: CmsSlots = {
  renderCollectionTop,
  renderCollectionControls,
  renderEntryCard,
  renderEntryListEmpty,
  renderLoader,
  renderWorkflowCard,
  renderEditorToolbar,
  renderEditorViewControls,
  renderMediaLibraryCard,
  renderMediaLibraryTop,
  // The Laika layout already supplies a top-level sidebar (LaikaSidebar), so
  // suppress the per-page sidebar that core's Collection page would otherwise
  // render — returning null lets the main pane reflow to fill the row.
  renderCollectionSidebar: () => null,
};

const extraRoutes: ExtraRoute[] = [{ path: '/settings', element: <LaikaSettingsPage /> }];

/**
 * Optional overrides for `LaikaApp`. Anything supplied here takes precedence
 * over the laika defaults — useful when an app wants the laika shell + one
 * or two surfaces of their own (e.g. a custom entry card while keeping the
 * laika header / sidebar / dashboard).
 *
 * The `slots` field is shallow-merged with the default laika slots — set a
 * slot to a function to override, or to `null`/`undefined` to keep laika's.
 */
export interface LaikaAppProps extends Omit<AppContentProps, 'slots' | 'extraRoutes'> {
  /** Override individual `CmsSlots` entries; merged on top of laika defaults. */
  slots?: CmsSlots;
  /** Extra routes appended after laika's `/settings` route. */
  extraRoutes?: ExtraRoute[];
}

function LaikaApp(props: LaikaAppProps = {}) {
  const mergedSlots: CmsSlots = { ...slots, ...(props.slots ?? {}) };
  const mergedExtraRoutes = props.extraRoutes
    ? [...extraRoutes, ...props.extraRoutes]
    : extraRoutes;

  return (
    <DefaultApp
      renderHeader={props.renderHeader ?? renderHeader}
      renderLayout={props.renderLayout ?? renderLayout}
      renderAuth={props.renderAuth ?? renderAuth}
      renderRoot={props.renderRoot ?? renderRoot}
      renderNotifications={props.renderNotifications ?? renderNotifications}
      renderNotFound={props.renderNotFound ?? renderNotFound}
      renderFooter={props.renderFooter ?? renderFooter}
      renderConfigLoading={props.renderConfigLoading ?? renderConfigLoading}
      renderConfigError={props.renderConfigError ?? renderConfigError}
      renderError={props.renderError ?? renderError}
      extraRoutes={mergedExtraRoutes}
      slots={mergedSlots}
    />
  );
}

function renderHeader(props: AppHeaderRenderProps) {
  return <LaikaHeader {...props} />;
}

function renderLayout(props: AppLayoutRenderProps) {
  return <LaikaLayout {...props} />;
}

function renderAuth(props: AppAuthRenderProps) {
  return <LaikaAuthenticationPage {...props} />;
}

function renderRoot() {
  return <LaikaDashboard />;
}

function renderCollectionTop(props: CollectionTopRenderProps) {
  return <LaikaCollectionTop {...props} />;
}

function renderEntryCard(props: EntryCardRenderProps) {
  return <LaikaEntryCard {...props} />;
}

function renderEntryListEmpty(props: EntryListEmptyRenderProps) {
  return <LaikaEmptyEntryList {...props} />;
}

function renderLoader(props: LoaderRenderProps) {
  return <LaikaLoader {...props} />;
}

function renderCollectionControls(props: CollectionControlsRenderProps) {
  return <LaikaCollectionControls {...props} />;
}

function renderEditorToolbar(props: EditorToolbarRenderProps) {
  return <LaikaEditorToolbar {...props} />;
}

function renderEditorViewControls(props: EditorViewControlsRenderProps) {
  return <LaikaEditorViewControls {...props} />;
}

function renderMediaLibraryCard(props: MediaLibraryCardRenderProps) {
  return <LaikaMediaLibraryCard {...props} />;
}

function renderMediaLibraryTop(props: MediaLibraryTopRenderProps) {
  return <LaikaMediaLibraryTop {...props} />;
}

function renderWorkflowCard(props: WorkflowCardRenderProps) {
  return <LaikaWorkflowCard {...props} />;
}

function renderNotifications() {
  return <LaikaNotifications />;
}

function renderNotFound() {
  return <LaikaNotFoundPage />;
}

function renderFooter() {
  return <LaikaFooter />;
}

function renderConfigLoading() {
  return <LaikaConfigLoading />;
}

function renderConfigError({ error }: { error: string }) {
  return <LaikaConfigError error={error} />;
}

function renderError(props: ErrorBoundaryRenderProps) {
  return <LaikaErrorScreen {...props} />;
}

export default LaikaApp;
