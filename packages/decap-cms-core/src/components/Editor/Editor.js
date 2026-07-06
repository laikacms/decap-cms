import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Loader } from 'decap-cms-ui-default';
import { translate } from 'react-polyglot';
import debounce from 'lodash/debounce';

import { history, navigateToCollection, navigateToNewEntry } from '../../routing/history';
import { logoutUser } from '../../actions/auth';
import {
  loadEntry,
  loadEntries,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  discardDraft,
  changeDraftField,
  changeDraftFieldValidation,
  persistEntry,
  deleteEntry,
  persistLocalBackup,
  loadLocalBackup,
  retrieveLocalBackup,
  deleteLocalBackup,
} from '../../actions/entries';
import {
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  unpublishPublishedEntry,
  deleteUnpublishedEntry,
} from '../../actions/editorialWorkflow';
import { loadDeployPreview } from '../../actions/deploys';
import { selectEntry, selectUnpublishedEntry, selectDeployPreview } from '../../reducers';
import { selectFields } from '../../reducers/collections';
import { status, EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import EditorInterface from './EditorInterface';
import withWorkflow from './withWorkflow';

export class Editor extends React.Component {
  static propTypes = {
    changeDraftField: PropTypes.func.isRequired,
    changeDraftFieldValidation: PropTypes.func.isRequired,
    collection: PropTypes.object.isRequired,
    createDraftDuplicateFromEntry: PropTypes.func.isRequired,
    createEmptyDraft: PropTypes.func.isRequired,
    discardDraft: PropTypes.func.isRequired,
    entry: PropTypes.object,
    entryDraft: PropTypes.object.isRequired,
    loadEntry: PropTypes.func.isRequired,
    persistEntry: PropTypes.func.isRequired,
    deleteEntry: PropTypes.func.isRequired,
    showDelete: PropTypes.bool.isRequired,
    fields: PropTypes.array.isRequired,
    slug: PropTypes.string,
    newEntry: PropTypes.bool.isRequired,
    displayUrl: PropTypes.string,
    hasWorkflow: PropTypes.bool,
    useOpenAuthoring: PropTypes.bool,
    unpublishedEntry: PropTypes.bool,
    isModification: PropTypes.bool,
    collectionEntriesLoaded: PropTypes.bool,
    updateUnpublishedEntryStatus: PropTypes.func.isRequired,
    publishUnpublishedEntry: PropTypes.func.isRequired,
    deleteUnpublishedEntry: PropTypes.func.isRequired,
    logoutUser: PropTypes.func.isRequired,
    loadEntries: PropTypes.func.isRequired,
    deployPreview: PropTypes.object,
    loadDeployPreview: PropTypes.func.isRequired,
    currentStatus: PropTypes.string,
    user: PropTypes.object,
    location: PropTypes.shape({
      pathname: PropTypes.string,
      search: PropTypes.string,
    }),
    hasChanged: PropTypes.bool,
    t: PropTypes.func.isRequired,
    retrieveLocalBackup: PropTypes.func.isRequired,
    localBackup: PropTypes.object,
    loadLocalBackup: PropTypes.func,
    persistLocalBackup: PropTypes.func.isRequired,
    deleteLocalBackup: PropTypes.func,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(Editor.propTypes, this.props, 'prop', 'Editor');

    const {
      newEntry,
      collection,
      slug,
      loadEntry,
      createEmptyDraft,
      loadEntries,
      retrieveLocalBackup,
      collectionEntriesLoaded,
      t,
    } = this.props;

    retrieveLocalBackup(collection, slug);

    if (newEntry) {
      createEmptyDraft(collection, this.props.location.search);
    } else {
      loadEntry(collection, slug);
    }

    const leaveMessage = t('editor.editor.onLeavePage');

    this.exitBlocker = event => {
      if (this.props.entryDraft.hasChanged) {
        // This message is ignored in most browsers, but its presence
        // triggers the confirmation dialog
        event.returnValue = leaveMessage;
        return leaveMessage;
      }
    };
    window.addEventListener('beforeunload', this.exitBlocker);

    const navigationBlocker = (location, action) => {
      /**
       * New entry being saved and redirected to it's new slug based url.
       */
      const isPersisting = this.props.entryDraft.entry?.isPersisting;
      const newRecord = this.props.entryDraft.entry?.newRecord;
      const newEntryPath = `/collections/${collection.name}/new`;
      if (
        isPersisting &&
        newRecord &&
        this.props.location.pathname === newEntryPath &&
        action === 'PUSH'
      ) {
        return;
      }

      if (this.props.hasChanged) {
        return leaveMessage;
      }
    };

    const unblock = history.block(navigationBlocker);

    /**
     * This will run as soon as the location actually changes, unless creating
     * a new post. The confirmation above will run first.
     */
    this.unlisten = history.listen((location, action) => {
      const newEntryPath = `/collections/${collection.name}/new`;
      const entriesPath = `/collections/${collection.name}/entries/`;
      const { pathname } = location;
      if (
        pathname.startsWith(newEntryPath) ||
        (pathname.startsWith(entriesPath) && action === 'PUSH')
      ) {
        return;
      }

      this.deleteBackup();

      unblock();
      this.unlisten();
    });

    if (!collectionEntriesLoaded) {
      loadEntries(collection);
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.localBackup && this.props.localBackup) {
      const confirmLoadBackup = window.confirm(this.props.t('editor.editor.confirmLoadBackup'));
      if (confirmLoadBackup) {
        this.props.loadLocalBackup();
      } else {
        this.deleteBackup();
      }
    }

    if (this.props.hasChanged) {
      this.createBackup(this.props.entryDraft.entry, this.props.collection);
    }

    if (prevProps.entry === this.props.entry) return;

    const { newEntry, collection } = this.props;

    if (newEntry) {
      prevProps.createEmptyDraft(collection, this.props.location.search);
    }
  }

  componentWillUnmount() {
    this.createBackup.flush();
    this.props.discardDraft();
    window.removeEventListener('beforeunload', this.exitBlocker);
  }

  createBackup = debounce(function (entry, collection) {
    this.props.persistLocalBackup(entry, collection);
  }, 2000);

  handleChangeDraftField = (field, value, metadata, i18n) => {
    const entries = [this.props.unPublishedEntry, this.props.publishedEntry].filter(Boolean);
    this.props.changeDraftField({ field, value, metadata, entries, i18n });
  };

  handleChangeStatus = newStatusName => {
    const { entryDraft, updateUnpublishedEntryStatus, collection, slug, currentStatus, t } =
      this.props;
    if (entryDraft.hasChanged) {
      window.alert(t('editor.editor.onUpdatingWithUnsavedChanges'));
      return;
    }
    const newStatus = status[newStatusName];
    updateUnpublishedEntryStatus(collection.name, slug, currentStatus, newStatus);
  };

  deleteBackup() {
    const { deleteLocalBackup, collection, slug, newEntry } = this.props;
    this.createBackup.cancel();
    deleteLocalBackup(collection, !newEntry && slug);
  }

  handlePersistEntry = async (opts = {}) => {
    const { createNew = false, duplicate = false } = opts;
    const {
      persistEntry,
      collection,
      currentStatus,
      hasWorkflow,
      loadEntry,
      slug,
      createDraftDuplicateFromEntry,
      entryDraft,
    } = this.props;

    try {
      await persistEntry(collection);
    } catch (e) {
      if (e instanceof Error && e.message === 'Entry has validation errors') {
        return;
      }
      throw e;
    }

    this.deleteBackup();

    if (createNew) {
      navigateToNewEntry(collection.name);
      duplicate && createDraftDuplicateFromEntry(entryDraft.entry);
    } else if (slug && hasWorkflow && !currentStatus) {
      loadEntry(collection, slug);
    }
  };

  handlePublishEntry = async (opts = {}) => {
    const { createNew = false, duplicate = false } = opts;
    const {
      publishUnpublishedEntry,
      createDraftDuplicateFromEntry,
      entryDraft,
      collection,
      slug,
      currentStatus,
      t,
    } = this.props;
    if (currentStatus !== status.PENDING_PUBLISH) {
      window.alert(t('editor.editor.onPublishingNotReady'));
      return;
    } else if (entryDraft.hasChanged) {
      window.alert(t('editor.editor.onPublishingWithUnsavedChanges'));
      return;
    } else if (!window.confirm(t('editor.editor.onPublishing'))) {
      return;
    }

    await publishUnpublishedEntry(collection.name, slug);

    this.deleteBackup();

    if (createNew) {
      navigateToNewEntry(collection.name);
    }

    duplicate && createDraftDuplicateFromEntry(entryDraft.entry);
  };

  handleUnpublishEntry = async () => {
    const { unpublishPublishedEntry, collection, slug, t } = this.props;
    if (!window.confirm(t('editor.editor.onUnpublishing'))) return;

    await unpublishPublishedEntry(collection, slug);

    return navigateToCollection(collection.name);
  };

  handleDuplicateEntry = () => {
    const { createDraftDuplicateFromEntry, collection, entryDraft } = this.props;

    navigateToNewEntry(collection.name);
    createDraftDuplicateFromEntry(entryDraft.entry);
  };

  handleDeleteEntry = () => {
    const { entryDraft, newEntry, collection, deleteEntry, slug, t } = this.props;
    if (entryDraft.hasChanged) {
      if (!window.confirm(t('editor.editor.onDeleteWithUnsavedChanges'))) {
        return;
      }
    } else if (!window.confirm(t('editor.editor.onDeletePublishedEntry'))) {
      return;
    }
    if (newEntry) {
      return navigateToCollection(collection.name);
    }

    setTimeout(async () => {
      await deleteEntry(collection, slug);
      this.deleteBackup();
      return navigateToCollection(collection.name);
    }, 0);
  };

  handleDeleteUnpublishedChanges = async () => {
    const { entryDraft, collection, slug, deleteUnpublishedEntry, loadEntry, isModification, t } =
      this.props;
    if (
      entryDraft.hasChanged &&
      !window.confirm(t('editor.editor.onDeleteUnpublishedChangesWithUnsavedChanges'))
    ) {
      return;
    } else if (!window.confirm(t('editor.editor.onDeleteUnpublishedChanges'))) {
      return;
    }
    await deleteUnpublishedEntry(collection.name, slug);

    this.deleteBackup();

    if (isModification) {
      loadEntry(collection, slug);
    } else {
      navigateToCollection(collection.name);
    }
  };

  render() {
    const {
      entry,
      entryDraft,
      fields,
      collection,
      changeDraftFieldValidation,
      user,
      hasChanged,
      displayUrl,
      hasWorkflow,
      useOpenAuthoring,
      unpublishedEntry,
      newEntry,
      isModification,
      currentStatus,
      logoutUser,
      deployPreview,
      loadDeployPreview,
      draftKey,
      slug,
      t,
      editorBackLink,
    } = this.props;

    const isPublished = !newEntry && !unpublishedEntry;

    if (entry && entry.error) {
      return (
        <div>
          <h3>{entry.error}</h3>
        </div>
      );
    } else if (
      entryDraft == null ||
      entryDraft.entry === undefined ||
      (entry && entry.isFetching)
    ) {
      return <Loader active>{t('editor.editor.loadingEntry')}</Loader>;
    }

    return (
      <EditorInterface
        draftKey={draftKey}
        entry={entryDraft.entry}
        collection={collection}
        fields={fields}
        fieldsMetaData={entryDraft.fieldsMetaData}
        fieldsErrors={entryDraft.fieldsErrors}
        onChange={this.handleChangeDraftField}
        onValidate={changeDraftFieldValidation}
        onPersist={this.handlePersistEntry}
        onDelete={this.handleDeleteEntry}
        onDeleteUnpublishedChanges={this.handleDeleteUnpublishedChanges}
        onChangeStatus={this.handleChangeStatus}
        onPublish={this.handlePublishEntry}
        unPublish={this.handleUnpublishEntry}
        onDuplicate={this.handleDuplicateEntry}
        showDelete={this.props.showDelete}
        user={user}
        hasChanged={hasChanged}
        displayUrl={displayUrl}
        hasWorkflow={hasWorkflow}
        useOpenAuthoring={useOpenAuthoring}
        hasUnpublishedChanges={unpublishedEntry}
        isNewEntry={newEntry}
        isModification={isModification}
        currentStatus={currentStatus}
        onLogoutClick={logoutUser}
        deployPreview={deployPreview}
        loadDeployPreview={opts => loadDeployPreview(collection, slug, entry, isPublished, opts)}
        editorBackLink={editorBackLink}
        t={t}
      />
    );
  }
}

function mapStateToProps(state, ownProps) {
  const { collections, entryDraft, auth, config, entries, globalUI } = state;
  const slug = ownProps.match.params[0];
  const collection = collections[ownProps.match.params.name];
  const collectionName = collection.name;
  const newEntry = ownProps.newRecord === true;
  const fields = selectFields(collection, slug);
  const entry = newEntry ? null : selectEntry(state, collectionName, slug);
  const user = auth.user;
  const hasChanged = entryDraft.hasChanged;
  const displayUrl = config.display_url;
  const hasWorkflow = config.publish_mode === EDITORIAL_WORKFLOW;
  const useOpenAuthoring = globalUI.useOpenAuthoring;
  const isModification = entryDraft.entry?.isModification;
  const collectionEntriesLoaded = !!entries.pages?.[collectionName];
  const unPublishedEntry = selectUnpublishedEntry(state, collectionName, slug);
  const publishedEntry = selectEntry(state, collectionName, slug);
  const currentStatus = unPublishedEntry && unPublishedEntry.status;
  const deployPreview = selectDeployPreview(state, collectionName, slug);
  const localBackup = entryDraft.localBackup;
  const draftKey = entryDraft.key;
  let editorBackLink = `/collections/${collectionName}`;
  if (new URLSearchParams(ownProps.location.search).get('ref') === 'workflow') {
    editorBackLink = `/workflow`;
  }

  if (collection.nested && slug) {
    const pathParts = slug.split('/');
    if (pathParts.length > 2) {
      editorBackLink = `${editorBackLink}/filter/${pathParts.slice(0, -2).join('/')}`;
    }
  }

  return {
    collection,
    collections,
    newEntry,
    entryDraft,
    fields,
    slug,
    entry,
    user,
    hasChanged,
    displayUrl,
    hasWorkflow,
    useOpenAuthoring,
    isModification,
    collectionEntriesLoaded,
    currentStatus,
    deployPreview,
    localBackup,
    draftKey,
    publishedEntry,
    unPublishedEntry,
    editorBackLink,
  };
}

const mapDispatchToProps = {
  changeDraftField,
  changeDraftFieldValidation,
  loadEntry,
  loadEntries,
  loadDeployPreview,
  loadLocalBackup,
  retrieveLocalBackup,
  persistLocalBackup,
  deleteLocalBackup,
  createDraftDuplicateFromEntry,
  createEmptyDraft,
  discardDraft,
  persistEntry,
  deleteEntry,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  unpublishPublishedEntry,
  deleteUnpublishedEntry,
  logoutUser,
};

export default connect(mapStateToProps, mapDispatchToProps)(withWorkflow(translate()(Editor)));
