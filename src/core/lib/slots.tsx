import React, { createContext, useContext } from 'react';

import type {
  CmsCollectionState,
  CmsCollections,
  CmsEntry,
  CmsSortDirection,
  CmsViewFilter,
  CmsViewGroup,
} from '../../lib/util/index';

/**
 * Render-slot extension surface for deep CMS components.
 *
 * Top-level layout slots (header, layout, auth page, dashboard root) flow
 * through `AppContentProps` as direct props. But components nested inside
 * the router — Collection, Editor, MediaLibrary — can't be customized via
 * props without invasive prop drilling. This context is the alternative:
 * laika-app (or any other app) supplies a `CmsSlots` object once at the
 * `AppContent` boundary, and any descendant component can read its own
 * slot via `useCmsSlots()`.
 *
 * **Adding a new slot** — add a typed field here (`renderEditorToolbar`,
 * `renderMediaLibrary`, …) plus its render-props interface. The consuming
 * component reads `useCmsSlots()`, branches on whether the slot is set,
 * and falls back to the default rendering when omitted. Default Decap CMS
 * behavior is preserved because the context default is an empty object.
 */

export interface CollectionTopRenderProps {
  collection: CmsCollectionState;
  newEntryUrl?: string;
}

export interface CollectionSidebarRenderProps {
  collections: CmsCollections;
  collection?: CmsCollectionState;
  isSearchEnabled?: boolean;
  searchTerm?: string;
  filterTerm?: string;
}

export interface CollectionControlsRenderProps {
  viewStyle: string;
  onChangeViewStyle: (style: string) => void;
  sortableFields: { key: string; label?: string }[];
  onSortClick: (key: string, direction: CmsSortDirection) => void;
  sort?: Record<string, unknown>;
  viewFilters?: CmsViewFilter[];
  viewGroups?: CmsViewGroup[];
  onFilterClick: (filter: CmsViewFilter) => void;
  onGroupClick: (group: CmsViewGroup) => void;
  filter?: Record<string, unknown>;
  group?: Record<string, unknown>;
}

export interface LoaderRenderProps {
  /**
   * Human-readable loading label, already i18n-translated. May be a single
   * string or an array that the default Loader rotates through.
   */
  label?: React.ReactNode;
  /** Where the loader is being shown — useful for picking layout/spacing. */
  context?: 'config' | 'entries' | 'entry' | 'workflow';
}

export interface EntryListEmptyRenderProps {
  /**
   * The collection being browsed, when the listing is scoped to one.
   * `undefined` for cross-collection search results pages.
   */
  collection?: CmsCollectionState;
}

export interface EntryCardRenderProps {
  collection: CmsCollectionState;
  entry: CmsEntry;
  inferredFields: { imageField?: string | null; [key: string]: unknown };
  collectionLabel?: string | false;
  viewStyle?: string;
  workflowStatus?: string | null;
}

export interface EditorToolbarRenderProps {
  isPersisting?: boolean;
  isPublishing?: boolean;
  isUpdatingStatus?: boolean;
  isDeleting?: boolean;
  onPersist: (opts?: { createNew?: boolean; duplicate?: boolean }) => void;
  onPersistAndNew: () => void;
  onPersistAndDuplicate: () => void;
  showDelete: boolean;
  onDelete: () => void;
  onDeleteUnpublishedChanges: () => void;
  onChangeStatus: (newStatus: string) => void;
  onPublish: (opts?: { createNew?: boolean; duplicate?: boolean }) => void;
  unPublish: () => void;
  onDuplicate: () => void;
  onPublishAndNew: () => void;
  onPublishAndDuplicate: () => void;
  user?: { login?: string; name?: string; avatar_url?: string };
  hasChanged?: boolean;
  displayUrl?: string;
  collection: CmsCollectionState;
  hasWorkflow?: boolean;
  useOpenAuthoring?: boolean;
  hasUnpublishedChanges?: boolean;
  isNewEntry?: boolean;
  isModification?: boolean;
  currentStatus?: string;
  onLogoutClick: () => void;
  deployPreview?: { url?: string; status?: string; isFetching?: boolean };
  loadDeployPreview: (opts?: { maxAttempts?: number; signal?: AbortSignal }) => void;
  editorBackLink: string;
}

export interface EditorViewControlsRenderProps {
  i18nEnabled: boolean;
  i18nVisible: boolean;
  onToggleI18n: () => void;
  previewEnabled: boolean;
  previewVisible: boolean;
  onTogglePreview: () => void;
  scrollSyncEnabled: boolean;
  scrollSyncVisible: boolean;
  onToggleScrollSync: () => void;
}

export interface MediaLibraryTopRenderProps {
  onClose: () => void;
  privateUpload?: boolean;
  forImage?: boolean;
  onDownload: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  query?: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  searchDisabled: boolean;
  onDelete: () => void;
  canInsert?: boolean;
  onInsert: () => void;
  hasSelection: boolean;
  isPersisting?: boolean;
  isDeleting?: boolean;
  selectedFile?: { path: string; draft: boolean; name: string } | Record<string, never>;
}

export interface MediaLibraryCardRenderProps {
  isSelected?: boolean;
  displayURL: Record<string, unknown>;
  text: string;
  onClick: () => void;
  draftText: string;
  width: string;
  height: string;
  margin: string;
  isPrivate?: boolean;
  type?: string;
  isViewableImage: boolean;
  loadDisplayURL: () => void;
  isDraft?: boolean;
}

export interface WorkflowCardRenderProps {
  collectionLabel: string;
  title?: string;
  authorLastChange?: string;
  body?: string;
  isModification?: boolean;
  editLink: string;
  timestamp: string;
  onDelete: () => void;
  allowPublish: boolean;
  canPublish: boolean;
  onPublish: () => void;
  postAuthor?: string;
}

export interface CmsSlots {
  /**
   * Replace the heading + "new entry" button rendered above a collection's
   * entry listing. Receives the collection and optional new-entry URL.
   */
  renderCollectionTop?: (props: CollectionTopRenderProps) => React.ReactNode;
  /**
   * Replace (or suppress) the per-page collection sidebar — the left rail
   * inside a collection's entry listing that shows the collection list +
   * in-collection search. Return `null` to suppress entirely (useful when
   * the app-level layout already supplies a sidebar via `renderLayout`).
   * When the slot returns `null`, the main pane reflows to fill the row.
   */
  renderCollectionSidebar?: (props: CollectionSidebarRenderProps) => React.ReactNode;
  /**
   * Replace the view-style / sort / filter / group toolbar rendered above
   * a collection's entry listing. The handlers and current state are
   * pre-resolved so the renderer stays presentational.
   */
  renderCollectionControls?: (props: CollectionControlsRenderProps) => React.ReactNode;
  /**
   * Replace the entry-card visual used in collection listings. Receives the
   * fully resolved entry data — collection, entry, inferred image field,
   * the active view style (list / grid), and the workflow status when the
   * editorial workflow is enabled.
   */
  renderEntryCard?: (props: EntryCardRenderProps) => React.ReactNode;
  /**
   * Render a zero-state placeholder when an entry listing has no entries.
   * Omit to keep the default empty `<CardsGrid>`. Fires only when the cards
   * array is fully resolved and empty — not during loading.
   */
  renderEntryListEmpty?: (props: EntryListEmptyRenderProps) => React.ReactNode;
  /**
   * Replace the generic `<Loader>` shown while collection entries, an
   * individual entry, or the workflow board is loading. Receives the
   * already-translated label and a `context` hint identifying where the
   * loader is being shown. Omit to keep the default `<Loader>`.
   */
  renderLoader?: (props: LoaderRenderProps) => React.ReactNode;
  /**
   * Replace the editorial-workflow card visual on the Workflow board.
   * Receives the same props as the default `WorkflowCard` — title, body,
   * author, edit link, publish/delete handlers — so consumers can re-skin
   * without re-implementing drag-and-drop or Redux integration.
   */
  renderWorkflowCard?: (props: WorkflowCardRenderProps) => React.ReactNode;
  /**
   * Replace the editor screen's top toolbar — the bar with save/publish/
   * delete actions above an entry's edit form. The full prop bundle is
   * pre-resolved so the renderer stays presentational and Redux-free.
   */
  renderEditorToolbar?: (props: EditorToolbarRenderProps) => React.ReactNode;
  /**
   * Replace the floating view-controls cluster inside the editor (the
   * pinned toggles for i18n, preview pane, and scroll-sync). Each toggle
   * comes in as `<feature>Enabled` (should it render at all) +
   * `<feature>Visible` (is it currently active) + the click handler.
   */
  renderEditorViewControls?: (props: EditorViewControlsRenderProps) => React.ReactNode;
  /**
   * Replace each card in the MediaLibrary grid (the modal that opens when
   * picking an image/file from a widget). Receives the file's display URL,
   * display name, selection state, click handler, and lazy display-URL
   * loader — so consumers can re-skin without re-implementing async asset
   * loading or selection wiring.
   */
  renderMediaLibraryCard?: (props: MediaLibraryCardRenderProps) => React.ReactNode;
  /**
   * Replace the top header of the MediaLibrary modal (title, search box,
   * upload / download / delete / insert buttons). Receives all click and
   * search-input handlers pre-resolved.
   */
  renderMediaLibraryTop?: (props: MediaLibraryTopRenderProps) => React.ReactNode;
}

const EMPTY_SLOTS: CmsSlots = {};

const CmsSlotsContext = createContext<CmsSlots>(EMPTY_SLOTS);

export interface CmsSlotsProviderProps {
  slots?: CmsSlots;
  children?: React.ReactNode;
}

export function CmsSlotsProvider({ slots, children }: CmsSlotsProviderProps) {
  return (
    <CmsSlotsContext.Provider value={slots ?? EMPTY_SLOTS}>{children}</CmsSlotsContext.Provider>
  );
}

export function useCmsSlots(): CmsSlots {
  return useContext(CmsSlotsContext);
}
