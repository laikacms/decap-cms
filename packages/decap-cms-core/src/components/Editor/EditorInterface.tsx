import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';
import { SplitPane } from 'react-split-pane';
import {
  colors,
  colorsRaw,
  components,
  transitions,
  IconButton,
  zIndex,
} from 'decap-cms-ui-default';
import { ScrollSync, ScrollSyncPane } from 'react-scroll-sync';

import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsCollectionState, CmsEntry, CmsEntryField } from 'decap-cms-lib-util';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;
import type { I18nInfo } from '../../lib/i18n';
import type { ReactNode } from 'react';

import EditorControlPane from './EditorControlPane/EditorControlPane';
import EditorPreviewPane from './EditorPreviewPane/EditorPreviewPane';
import EditorToolbar from './EditorToolbar';
import { hasI18n, getI18nInfo, getPreviewEntry } from '../../lib/i18n';
import { FILES } from '../../constants/collectionTypes';
import { getFileFromSlug } from '../../reducers/collections';

const PREVIEW_VISIBLE = 'cms.preview-visible';
const SCROLL_SYNC_ENABLED = 'cms.scroll-sync-enabled';
const SPLIT_PANE_POSITION = 'cms.split-pane-position';
const I18N_VISIBLE = 'cms.i18n-visible';

const styles = {
  splitPane: css`
    ${components.card};
    border-radius: 0;
    height: 100%;
  `,
  pane: css`
    height: 100%;
    overflow-y: auto;
  `,
};

const EditorToggle = styled(IconButton)`
  margin-bottom: 12px;
`;

function ReactSplitPaneGlobalStyles() {
  return (
    <Global
      styles={css`
        .Resizer.vertical {
          width: 2px;
          cursor: col-resize;
          position: relative;
          background: none;

          &:before {
            content: '';
            width: 2px;
            height: 100%;
            position: relative;
            background-color: ${colors.textFieldBorder};
            display: block;
            z-index: 10;
            transition: background-color ${transitions.main};
          }

          &:hover,
          &:active {
            &:before {
              width: 4px;
              left: -1px;
              background-color: ${colorsRaw.blue};
            }
          }
        }
      `}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledSplitPane = styled(SplitPane as any)`
  ${styles.splitPane};

  /**
   * Quick fix for preview pane not fully displaying in Safari
   */
  .Pane {
    height: 100%;
  }
`;

const NoPreviewContainer = styled.div`
  ${styles.splitPane};
`;

const EditorContainer = styled.div`
  width: 100%;
  min-width: 800px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  padding-top: 66px;
  background-color: ${colors.background};
`;

const Editor = styled.div`
  height: 100%;
  margin: 0 auto;
  position: relative;
`;

interface PreviewPaneContainerProps {
  $blockEntry?: boolean;
  $overFlow?: boolean;
}

const PreviewPaneContainer = styled.div<PreviewPaneContainerProps>`
  height: 100%;
  pointer-events: ${(props: PreviewPaneContainerProps) => (props.$blockEntry ? 'none' : 'auto')};
  overflow-y: ${(props: PreviewPaneContainerProps) => (props.$overFlow ? 'auto' : 'hidden')};
`;

const ControlPaneContainer = styled(PreviewPaneContainer)`
  padding: 0 16px;
  position: relative;
  overflow-x: hidden;
`;

const ViewControls = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: ${zIndex.zIndex299};
`;

interface EditorContentProps {
  i18nVisible: boolean;
  previewVisible: boolean;
  editor: ReactNode;
  editorWithEditor: ReactNode;
  editorWithPreview: ReactNode;
}

function EditorContent({
  i18nVisible,
  previewVisible,
  editor,
  editorWithEditor,
  editorWithPreview,
}: EditorContentProps) {
  if (i18nVisible) {
    return editorWithEditor;
  } else if (previewVisible) {
    return editorWithPreview;
  } else {
    return <NoPreviewContainer>{editor}</NoPreviewContainer>;
  }
}

function isPreviewEnabled(collection: Collection, entry: EntryMap) {
  if (collection.type === FILES) {
    const file = getFileFromSlug(collection, entry.slug);
    const previewEnabled = (file as any)?.editor?.preview;
    if (previewEnabled != null) return previewEnabled;
  }
  return (collection as any).editor?.preview ?? true;
}

interface EditorInterfaceProps {
  collection: Collection;
  entry: EntryMap;
  fields: EntryField[];
  fieldsMetaData: Record<string, Record<string, unknown>>;
  fieldsErrors: Record<string, { type: string; message: string }[]>;
  onChange: (field: EntryField, value: unknown, metadata?: unknown, i18n?: unknown) => void;
  onValidate: (fieldName: string, errors: { type: string; message: string }[]) => void;
  onPersist: (opts?: { createNew?: boolean; duplicate?: boolean }) => void;
  showDelete: boolean;
  onDelete: () => void;
  onDeleteUnpublishedChanges: () => void;
  onPublish: (opts?: { createNew?: boolean; duplicate?: boolean }) => void;
  unPublish: () => void;
  onDuplicate: () => void;
  onChangeStatus: (newStatus: string) => void;
  user?: { login?: string; name?: string; avatar_url?: string; [key: string]: unknown };
  hasChanged?: boolean;
  displayUrl?: string;
  hasWorkflow?: boolean;
  useOpenAuthoring?: boolean;
  hasUnpublishedChanges?: boolean;
  isNewEntry?: boolean;
  isModification?: boolean;
  currentStatus?: string;
  onLogoutClick: () => void;
  deployPreview?: { url?: string; status?: string; [key: string]: unknown };
  loadDeployPreview: (...args: unknown[]) => void;
  draftKey: string;
  t: TranslateFunction;
  editorBackLink?: string;
}

type ControlPaneRef = InstanceType<typeof EditorControlPane>;

class EditorInterface extends Component<EditorInterfaceProps> {
  controlPaneRef: ControlPaneRef | null = null;

  state = {
    showEventBlocker: false,
    previewVisible: localStorage.getItem(PREVIEW_VISIBLE) !== 'false',
    scrollSyncEnabled: localStorage.getItem(SCROLL_SYNC_ENABLED) !== 'false',
    i18nVisible: localStorage.getItem(I18N_VISIBLE) !== 'false',
    leftPanelLocale: undefined as string | undefined,
  };

  handleFieldClick = (path: string) => {
    this.controlPaneRef?.focus(path);
  };

  handleSplitPaneDragStart = () => {
    this.setState({ showEventBlocker: true });
  };

  handleSplitPaneDragFinished = () => {
    this.setState({ showEventBlocker: false });
  };

  handleOnPersist = async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
    const { createNew = false, duplicate = false } = opts;
    await this.controlPaneRef?.switchToDefaultLocale();
    this.controlPaneRef?.validate();
    this.props.onPersist({ createNew, duplicate });
  };

  handleOnPublish = async (opts: { createNew?: boolean; duplicate?: boolean } = {}) => {
    const { createNew = false, duplicate = false } = opts;
    await this.controlPaneRef?.switchToDefaultLocale();
    this.controlPaneRef?.validate();
    this.props.onPublish({ createNew, duplicate });
  };

  handleTogglePreview = () => {
    const newPreviewVisible = !this.state.previewVisible;
    this.setState({ previewVisible: newPreviewVisible });
    localStorage.setItem(PREVIEW_VISIBLE, String(newPreviewVisible));
  };

  handleToggleScrollSync = () => {
    const newScrollSyncEnabled = !this.state.scrollSyncEnabled;
    this.setState({ scrollSyncEnabled: newScrollSyncEnabled });
    localStorage.setItem(SCROLL_SYNC_ENABLED, String(newScrollSyncEnabled));
  };

  handleToggleI18n = () => {
    const newI18nVisible = !this.state.i18nVisible;
    this.setState({ i18nVisible: newI18nVisible });
    localStorage.setItem(I18N_VISIBLE, String(newI18nVisible));
  };

  handleLeftPanelLocaleChange = (locale: string) => {
    this.setState({ leftPanelLocale: locale });
  };

  render() {
    const {
      collection,
      entry,
      fields,
      fieldsMetaData,
      fieldsErrors,
      onChange,
      showDelete,
      onDelete,
      onDeleteUnpublishedChanges,
      onChangeStatus,
      onPublish,
      unPublish,
      onDuplicate,
      onValidate,
      user,
      hasChanged,
      displayUrl,
      hasWorkflow,
      useOpenAuthoring,
      hasUnpublishedChanges,
      isNewEntry,
      isModification,
      currentStatus,
      onLogoutClick,
      loadDeployPreview,
      deployPreview,
      draftKey,
      editorBackLink,
      t,
    } = this.props;

    const { scrollSyncEnabled, showEventBlocker } = this.state;

    const previewEnabled = isPreviewEnabled(collection, entry);

    const i18nInfo = getI18nInfo(this.props.collection) as I18nInfo;
    const locales = i18nInfo.locales || [];
    const defaultLocale = i18nInfo.defaultLocale || '';
    const collectionI18nEnabled = hasI18n(collection) && locales.length > 1;
    const editorProps = {
      collection,
      entry,
      fields,
      fieldsMetaData,
      fieldsErrors,
      onChange,
      onValidate,
    };

    const leftPanelLocale = this.state.leftPanelLocale || locales?.[0];
    const editor = (
      <ControlPaneContainer $overFlow $blockEntry={showEventBlocker}>
        <EditorControlPane
          {...editorProps}
          ref={(c: ControlPaneRef | null) => {
            this.controlPaneRef = c;
          }}
          locale={leftPanelLocale}
          t={t}
          onLocaleChange={this.handleLeftPanelLocaleChange}
        />
      </ControlPaneContainer>
    );

    const editor2 = (
      <ControlPaneContainer
        $overFlow={!this.state.scrollSyncEnabled}
        $blockEntry={showEventBlocker}
      >
        <EditorControlPane {...editorProps} locale={locales?.[1]} t={t} />
      </ControlPaneContainer>
    );

    const previewEntry = collectionI18nEnabled
      ? getPreviewEntry(entry, leftPanelLocale, defaultLocale)
      : entry;

    const editorWithPreview = (
      <ScrollSync enabled={this.state.scrollSyncEnabled}>
        <div>
          <ReactSplitPaneGlobalStyles />
          <StyledSplitPane
            maxSize={-100}
            minSize={400}
            defaultSize={parseInt(localStorage.getItem(SPLIT_PANE_POSITION) || '0', 10) || '50%'}
            onChange={(size: number) => localStorage.setItem(SPLIT_PANE_POSITION, String(size))}
            onDragStarted={this.handleSplitPaneDragStart}
            onDragFinished={this.handleSplitPaneDragFinished}
          >
            <ScrollSyncPane>{editor}</ScrollSyncPane>
            <PreviewPaneContainer $blockEntry={showEventBlocker}>
              <EditorPreviewPane
                collection={collection}
                entry={previewEntry}
                fields={fields}
                fieldsMetaData={fieldsMetaData}
                locale={leftPanelLocale}
                onFieldClick={this.handleFieldClick}
              />
            </PreviewPaneContainer>
          </StyledSplitPane>
        </div>
      </ScrollSync>
    );

    const editorWithEditor = (
      <ScrollSync enabled={this.state.scrollSyncEnabled}>
        <div>
          <StyledSplitPane
            maxSize={-100}
            defaultSize={parseInt(localStorage.getItem(SPLIT_PANE_POSITION) || '0', 10) || '50%'}
            onChange={(size: number) => localStorage.setItem(SPLIT_PANE_POSITION, String(size))}
            onDragStarted={this.handleSplitPaneDragStart}
            onDragFinished={this.handleSplitPaneDragFinished}
          >
            <ScrollSyncPane>{editor}</ScrollSyncPane>
            <ScrollSyncPane>{editor2}</ScrollSyncPane>
          </StyledSplitPane>
        </div>
      </ScrollSync>
    );

    const i18nVisible = collectionI18nEnabled && this.state.i18nVisible;
    const previewVisible = previewEnabled && this.state.previewVisible;
    const scrollSyncVisible = i18nVisible || previewVisible;

    return (
      <EditorContainer>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {React.createElement(EditorToolbar as any, {
          isPersisting: entry.isPersisting,
          isPublishing: (entry as any).isPublishing,
          isUpdatingStatus: (entry as any).isUpdatingStatus,
          isDeleting: (entry as any).isDeleting,
          onPersist: this.handleOnPersist,
          onPersistAndNew: () => this.handleOnPersist({ createNew: true }),
          onPersistAndDuplicate: () => this.handleOnPersist({ createNew: true, duplicate: true }),
          onDelete,
          onDeleteUnpublishedChanges,
          onChangeStatus,
          showDelete,
          onPublish,
          unPublish,
          onDuplicate,
          onPublishAndNew: () => this.handleOnPublish({ createNew: true }),
          onPublishAndDuplicate: () => this.handleOnPublish({ createNew: true, duplicate: true }),
          user,
          hasChanged,
          displayUrl,
          collection,
          hasWorkflow,
          useOpenAuthoring,
          hasUnpublishedChanges,
          isNewEntry,
          isModification,
          currentStatus,
          onLogoutClick,
          loadDeployPreview,
          deployPreview,
          editorBackLink: editorBackLink || '',
          t,
        })}
        <Editor key={draftKey}>
          <ViewControls>
            {collectionI18nEnabled && (
              <EditorToggle
                isActive={i18nVisible}
                onClick={this.handleToggleI18n}
                size="large"
                type="page"
                title={t('editor.editorInterface.toggleI18n')}
              />
            )}
            {previewEnabled && (
              <EditorToggle
                isActive={previewVisible}
                onClick={this.handleTogglePreview}
                size="large"
                type="eye"
                title={t('editor.editorInterface.togglePreview')}
              />
            )}
            {scrollSyncVisible && !(collection as any).editor?.visualEditing && (
              <EditorToggle
                isActive={scrollSyncEnabled}
                onClick={this.handleToggleScrollSync}
                size="large"
                type="scroll"
                title={t('editor.editorInterface.toggleScrollSync')}
              />
            )}
          </ViewControls>
          <EditorContent
            i18nVisible={!!i18nVisible}
            previewVisible={!!previewVisible}
            editor={editor}
            editorWithEditor={editorWithEditor}
            editorWithPreview={editorWithPreview}
          />
        </Editor>
      </EditorContainer>
    );
  }
}

EditorInterface.propTypes = {
  collection: PropTypes.object.isRequired,
  entry: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  fieldsMetaData: PropTypes.object.isRequired,
  fieldsErrors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  onPersist: PropTypes.func.isRequired,
  showDelete: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDeleteUnpublishedChanges: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  unPublish: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onChangeStatus: PropTypes.func.isRequired,
  user: PropTypes.object,
  hasChanged: PropTypes.bool,
  displayUrl: PropTypes.string,
  hasWorkflow: PropTypes.bool,
  useOpenAuthoring: PropTypes.bool,
  hasUnpublishedChanges: PropTypes.bool,
  isNewEntry: PropTypes.bool,
  isModification: PropTypes.bool,
  currentStatus: PropTypes.string,
  onLogoutClick: PropTypes.func.isRequired,
  deployPreview: PropTypes.object,
  loadDeployPreview: PropTypes.func.isRequired,
  draftKey: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

export default EditorInterface;
