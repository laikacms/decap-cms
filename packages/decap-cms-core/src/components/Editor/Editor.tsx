import React, { useCallback, useMemo, useRef } from 'react';
import { Loader } from 'decap-cms-ui-default';

import { useEditor } from '../../hooks/useEditor';
import EditorInterface from './EditorInterface';

import type { RouteComponentProps } from 'react-router-dom';

interface EditorRouteParams {
  name: string;
  0?: string; // slug
}

interface EditorProps extends RouteComponentProps<EditorRouteParams> {
  newRecord?: boolean;
}

function Editor({ match, location, newRecord = false }: EditorProps) {
  const collectionName = match.params.name;
  const slug = match.params[0];
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
  if (entry && entry.get('error')) {
    return (
      <div>
        <h3>{entry.get('error')}</h3>
      </div>
    );
  }
  
  if (
    entryDraft == null ||
    entryDraft.get('entry') === undefined ||
    (entry && entry.get('isFetching'))
  ) {
    return <Loader active>{t('editor.editor.loadingEntry')}</Loader>;
  }
  
  return (
    <EditorInterface
      draftKey={draftKey}
      entry={entryDraft.get('entry')}
      collection={collection}
      fields={fields}
      fieldsMetaData={entryDraft.get('fieldsMetaData')}
      fieldsErrors={entryDraft.get('fieldsErrors')}
      onChange={handleChangeDraftField}
      onValidate={handleValidate}
      onPersist={handlePersistEntry}
      onDelete={handleDeleteEntry}
      onDeleteUnpublishedChanges={handleDeleteUnpublishedChanges}
      onChangeStatus={handleChangeStatus}
      onPublish={handlePublishEntry}
      unPublish={handleUnpublishEntry}
      onDuplicate={handleDuplicateEntry}
      showDelete={showDelete}
      user={user}
      hasChanged={hasChanged}
      displayUrl={displayUrl}
      hasWorkflow={hasWorkflow}
      useOpenAuthoring={useOpenAuthoring}
      hasUnpublishedChanges={unpublishedEntry}
      isNewEntry={newEntry}
      isModification={isModification}
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
