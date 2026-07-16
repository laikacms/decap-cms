import React, { useEffect, useRef } from 'react';

import NotFoundPage from '@/core/components/NotFoundPage';
import { useEditor } from '@/core/hooks/useEditor';
import { useCmsSlots } from '@/core/lib/slots';
import { useLocation } from '@/core/routing/context';
import { Loader } from '@/ui/default/index';
import EditorInterface from './EditorInterface';

interface EditorProps {
  newRecord?: boolean;
  /** Collection the edited entry belongs to. Supplied by the route switch. */
  collectionName: string;
  /** Entry slug; omitted for a new entry. Supplied by the route switch. */
  slug?: string;
  /**
   * Custom not-found renderer threaded down from `AppContent`/`AppRoutes`
   * (the same prop `CollectionGuard` uses). Used in place of the default
   * `NotFoundPage` when the entry fails to load (DCMS-445) — this route
   * bypasses the app-shell chrome entirely otherwise, dead-ending the user
   * with no way back to the collection list.
   */
  renderNotFound?: () => React.ReactNode;
}

function Editor({ newRecord = false, collectionName, slug, renderNotFound }: EditorProps) {
  const { renderLoader } = useCmsSlots();
  const location = useLocation();
  const newEntry = newRecord === true;

  // Track previous values for update logic
  const prevLocalBackupRef = useRef<unknown>(undefined);
  const prevEntryRef = useRef<unknown>(undefined);

  const editor = useEditor({
    collectionName,
    slug,
    newEntry,
    locationSearch: location.search,
    locationPathname: location.pathname,
  });

  const {
    collection,
    entry,
    entryDraft,
    fields,
    user,
    hasChanged,
    displayUrl,
    hasWorkflow,
    useOpenAuthoring,
    isModification,
    currentStatus,
    deployPreview,
    localBackup,
    draftKey,
    editorBackLink,
    unpublishedEntry,
    showDelete,
    setup,
    handleLocalBackupCheck,
    handleBackupOnChange,
    handleEntryChange,
    handleChangeDraftField,
    handleChangeStatus,
    handlePersistEntry,
    handlePublishEntry,
    handleUnpublishEntry,
    handleDuplicateEntry,
    handleDeleteEntry,
    handleDeleteUnpublishedChanges,
    handleLogout,
    handleLoadDeployPreview,
    handleValidate,
    t,
  } = editor;

  // Setup on mount and teardown on unmount (replaces componentDidMount /
  // componentWillUnmount). Side effects must run in an effect, not during
  // render: `setup()` dispatches Redux actions, and dispatching while
  // rendering triggers React's "cannot update a component while rendering a
  // different component" warning (the store update reaches subscribed parents
  // like AppContent mid-render).
  //
  // Keyed on the edited-entry identity rather than `setup`'s identity: `setup`
  // is a useCallback whose deps include `entryDraft`, so it changes on every
  // keystroke — depending on it would re-run history.block()/loadEntries on
  // every edit. We want the once-per-entry semantics of the old lifecycle.
  const editKey = `${collectionName}/${slug ?? ''}/${newEntry}`;
  useEffect(() => {
    if (!collection) return;
    const result = setup();
    return result.cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKey]);

  // Handle local backup check (replaces componentDidUpdate for localBackup)
  useEffect(() => {
    if (prevLocalBackupRef.current !== localBackup) {
      handleLocalBackupCheck(prevLocalBackupRef.current);
      prevLocalBackupRef.current = localBackup;
    }
  }, [localBackup, handleLocalBackupCheck]);

  // Handle backup on change (replaces componentDidUpdate for hasChanged)
  useEffect(() => {
    handleBackupOnChange();
  }, [handleBackupOnChange]);

  // Handle entry change (replaces componentDidUpdate for entry)
  useEffect(() => {
    if (prevEntryRef.current !== entry) {
      handleEntryChange(prevEntryRef.current);
      prevEntryRef.current = entry;
    }
  }, [entry, handleEntryChange]);

  const isPublished = !newEntry && !unpublishedEntry;

  // Render the failed-load state. This route mounts under the fullscreen
  // editor layout (which hides the app-shell top-nav, expecting
  // `EditorInterface`'s own header instead — see `isEditorRouteKey` in
  // `App.tsx`), so without this the user is left with zero app chrome and no
  // in-app way back to the collection list (DCMS-445).
  if (entry && (entry as any).error) {
    return renderNotFound ? <>{renderNotFound()}</> : (
      <NotFoundPage
        message={(entry as any).error}
        backLink={{ to: editorBackLink, label: collection?.label ?? collectionName }}
      />
    );
  }

  if (
    entryDraft == null
    || (entryDraft as any).entry === undefined
    || (entry && (entry as any).isFetching)
  ) {
    return renderLoader
      ? <>{renderLoader({ label: t('editor.editor.loadingEntry'), context: 'entry' })}</>
      : <Loader active>{t('editor.editor.loadingEntry')}</Loader>;
  }

  return (
    <EditorInterface
      draftKey={draftKey || ''}
      entry={entryDraft.entry}
      collection={collection!}
      fields={fields!}
      fieldsMetaData={entryDraft.fieldsMetaData as any}
      fieldsErrors={entryDraft.fieldsErrors as any}
      onChange={handleChangeDraftField}
      onValidate={handleValidate}
      onPersist={handlePersistEntry}
      onDelete={handleDeleteEntry}
      onDeleteUnpublishedChanges={handleDeleteUnpublishedChanges}
      onChangeStatus={handleChangeStatus}
      onPublish={handlePublishEntry}
      unPublish={handleUnpublishEntry}
      onDuplicate={handleDuplicateEntry}
      showDelete={showDelete ?? false}
      user={user}
      hasChanged={hasChanged ?? false}
      displayUrl={displayUrl}
      hasWorkflow={hasWorkflow ?? false}
      useOpenAuthoring={useOpenAuthoring ?? false}
      hasUnpublishedChanges={unpublishedEntry}
      isNewEntry={newEntry}
      isModification={isModification ?? false}
      currentStatus={currentStatus}
      onLogoutClick={handleLogout}
      deployPreview={deployPreview}
      loadDeployPreview={handleLoadDeployPreview}
      editorBackLink={editorBackLink}
      t={t}
    />
  );
}

export default Editor;
