import React, { useEffect, useRef } from 'react';

import { useLocation } from '../../routing/context';
import { Loader } from '../../../ui/default/index';
import { useEditor } from '../../hooks/useEditor';
import EditorInterface from './EditorInterface';
import { useCmsSlots } from '../../lib/slots';

interface EditorProps {
  newRecord?: boolean;
  /** Collection the edited entry belongs to. Supplied by the route switch. */
  collectionName: string;
  /** Entry slug; omitted for a new entry. Supplied by the route switch. */
  slug?: string;
}

function Editor({ newRecord = false, collectionName, slug }: EditorProps) {
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

  // Render loading state
  if (entry && (entry as any).error) {
    return (
      <div>
        <h3>{(entry as any).error}</h3>
      </div>
    );
  }

  if (
    entryDraft == null ||
    (entryDraft as any).entry === undefined ||
    (entry && (entry as any).isFetching)
  ) {
    return renderLoader ? (
      <>{renderLoader({ label: t('editor.editor.loadingEntry'), context: 'entry' })}</>
    ) : (
      <Loader active>{t('editor.editor.loadingEntry')}</Loader>
    );
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
