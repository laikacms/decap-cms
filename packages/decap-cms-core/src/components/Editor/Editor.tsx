import React, { useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Loader } from 'decap-cms-ui-default';

import { useEditor } from '../../hooks/useEditor';
import EditorInterface from './EditorInterface';

interface EditorProps {
  newRecord?: boolean;
}

function Editor({ newRecord = false }: EditorProps) {
  const params = useParams<{ name: string; '*'?: string }>();
  const location = useLocation();
  const collectionName = params.name!;
  const slug = params['*'];
  const newEntry = newRecord === true;

  // Track previous values for update logic
  const prevLocalBackupRef = useRef<unknown>(undefined);
  const prevEntryRef = useRef<unknown>(undefined);
  const setupDoneRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  // Setup on first render (replaces componentDidMount)
  // Using useMemo to run setup synchronously on first render
  useMemo(() => {
    if (!setupDoneRef.current && collection) {
      setupDoneRef.current = true;
      const result = setup();
      cleanupRef.current = result.cleanup;
    }
  }, [collection, setup]);

  // Handle local backup check (replaces componentDidUpdate for localBackup)
  useMemo(() => {
    if (prevLocalBackupRef.current !== localBackup) {
      handleLocalBackupCheck(prevLocalBackupRef.current);
      prevLocalBackupRef.current = localBackup;
    }
  }, [localBackup, handleLocalBackupCheck]);

  // Handle backup on change (replaces componentDidUpdate for hasChanged)
  useMemo(() => {
    handleBackupOnChange();
  }, [handleBackupOnChange]);

  // Handle entry change (replaces componentDidUpdate for entry)
  useMemo(() => {
    if (prevEntryRef.current !== entry) {
      handleEntryChange(prevEntryRef.current);
      prevEntryRef.current = entry;
    }
  }, [entry, handleEntryChange]);

  // Cleanup handler - store in ref for external cleanup if needed
  // Note: Without useEffect, cleanup must be handled differently
  // The setup function returns a cleanup that should be called when navigating away
  // This is handled by the history listener in the setup function

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
    return <Loader active>{t('editor.editor.loadingEntry')}</Loader>;
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
