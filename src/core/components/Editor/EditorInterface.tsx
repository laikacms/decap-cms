import React from 'react';
import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';
import { Pane, SplitPane } from 'react-split-pane';
import { ScrollSync, ScrollSyncPane } from 'react-scroll-sync';

import {
  colors,
  colorsRaw,
  components,
  transitions,
  IconButton,
  zIndex,
} from '../../../ui/default/index';
import EditorControlPane, { type ControlPaneHandle } from './EditorControlPane/EditorControlPane';
import EditorPreviewPane from './EditorPreviewPane/EditorPreviewPane';
import EditorToolbar from './EditorToolbar';
import { useCmsSlots } from '../../lib/slots';
import { hasI18n, getI18nInfo, getPreviewEntry } from '../../lib/i18n';
import { FILES } from '../../constants/collectionTypes';
import { getFileFromSlug } from '../../reducers/collections';

import type { ReactNode } from 'react';
import type { I18nInfo } from '../../lib/i18n';
import type { CmsCollectionState, CmsEntry, CmsEntryField } from '../../../lib/util/index';
import type { TranslateFunction } from '../../../ui/default/index';

type Collection = CmsCollectionState;
type EntryMap = CmsEntry;
type EntryField = CmsEntryField;

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

// Wrapper between `Editor` and the split pane. Must be full-height: the split
// pane and its panes are `height: 100%`, so without a definite-height parent
// the percentage collapses and the preview pane (Pane2), whose only content is
// the ~150px-intrinsic iframe, shrinks instead of filling the editor.
const SplitPaneWrapper = styled.div`
  height: 100%;
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

type ControlPaneRef = ControlPaneHandle;

function EditorInterface(props: EditorInterfaceProps) {
  const { renderEditorToolbar, renderEditorViewControls } = useCmsSlots();
  const {
    collection,
    entry,
    fields,
    fieldsMetaData,
    fieldsErrors,
    onChange,
    onPersist,
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
  } = props;

  const controlPaneRef = React.useRef<ControlPaneRef | null>(null);
  const [showEventBlocker, setShowEventBlocker] = React.useState(false);
  const [previewVisible, setPreviewVisible] = React.useState(
    () => localStorage.getItem(PREVIEW_VISIBLE) !== 'false',
  );
  const [scrollSyncEnabled, setScrollSyncEnabled] = React.useState(
    () => localStorage.getItem(SCROLL_SYNC_ENABLED) !== 'false',
  );
  const [i18nVisibleState, setI18nVisibleState] = React.useState(
    () => localStorage.getItem(I18N_VISIBLE) !== 'false',
  );
  const [leftPanelLocaleState, setLeftPanelLocale] = React.useState<string | undefined>(undefined);

  function handleFieldClick(path: string) {
    controlPaneRef.current?.focus(path);
  }

  function handleSplitPaneDragStart() {
    setShowEventBlocker(true);
  }

  function handleSplitPaneDragFinished() {
    setShowEventBlocker(false);
  }

  async function handleOnPersist(opts: { createNew?: boolean; duplicate?: boolean } = {}) {
    const { createNew = false, duplicate = false } = opts;
    await controlPaneRef.current?.switchToDefaultLocale();
    controlPaneRef.current?.validate();
    onPersist({ createNew, duplicate });
  }

  async function handleOnPublish(opts: { createNew?: boolean; duplicate?: boolean } = {}) {
    const { createNew = false, duplicate = false } = opts;
    await controlPaneRef.current?.switchToDefaultLocale();
    controlPaneRef.current?.validate();
    onPublish({ createNew, duplicate });
  }

  function handleTogglePreview() {
    setPreviewVisible(prev => {
      const next = !prev;
      localStorage.setItem(PREVIEW_VISIBLE, String(next));
      return next;
    });
  }

  function handleToggleScrollSync() {
    setScrollSyncEnabled(prev => {
      const next = !prev;
      localStorage.setItem(SCROLL_SYNC_ENABLED, String(next));
      return next;
    });
  }

  function handleToggleI18n() {
    setI18nVisibleState(prev => {
      const next = !prev;
      localStorage.setItem(I18N_VISIBLE, String(next));
      return next;
    });
  }

  const previewEnabled = isPreviewEnabled(collection, entry);

  const i18nInfo = getI18nInfo(collection) as I18nInfo;
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

  const leftPanelLocale = leftPanelLocaleState || locales?.[0];
  const editor = (
    <ControlPaneContainer $overFlow $blockEntry={showEventBlocker}>
      <EditorControlPane
        {...editorProps}
        ref={(c: ControlPaneRef | null) => {
          controlPaneRef.current = c;
        }}
        locale={leftPanelLocale}
        t={t}
        onLocaleChange={setLeftPanelLocale}
      />
    </ControlPaneContainer>
  );

  const editor2 = (
    <ControlPaneContainer $overFlow={!scrollSyncEnabled} $blockEntry={showEventBlocker}>
      <EditorControlPane {...editorProps} locale={locales?.[1]} t={t} />
    </ControlPaneContainer>
  );

  const previewEntry = collectionI18nEnabled
    ? getPreviewEntry(entry, leftPanelLocale, defaultLocale)
    : entry;

  const editorWithPreview = (
    <ScrollSync enabled={scrollSyncEnabled}>
      <SplitPaneWrapper>
        <ReactSplitPaneGlobalStyles />
        <StyledSplitPane
          maxSize={-100}
          minSize={400}
          defaultSize={parseInt(localStorage.getItem(SPLIT_PANE_POSITION) || '0', 10) || '50%'}
          onChange={(size: number) => localStorage.setItem(SPLIT_PANE_POSITION, String(size))}
          onDragStarted={handleSplitPaneDragStart}
          onDragFinished={handleSplitPaneDragFinished}
        >
          <Pane className="Pane1">
            <ScrollSyncPane>{editor}</ScrollSyncPane>
          </Pane>
          <Pane className="Pane2">
            <PreviewPaneContainer $blockEntry={showEventBlocker}>
              <EditorPreviewPane
                collection={collection}
                entry={previewEntry}
                fields={fields}
                fieldsMetaData={fieldsMetaData}
                locale={leftPanelLocale}
                onFieldClick={handleFieldClick}
              />
            </PreviewPaneContainer>
          </Pane>
        </StyledSplitPane>
      </SplitPaneWrapper>
    </ScrollSync>
  );

  const editorWithEditor = (
    <ScrollSync enabled={scrollSyncEnabled}>
      <SplitPaneWrapper>
        <StyledSplitPane
          maxSize={-100}
          defaultSize={parseInt(localStorage.getItem(SPLIT_PANE_POSITION) || '0', 10) || '50%'}
          onChange={(size: number) => localStorage.setItem(SPLIT_PANE_POSITION, String(size))}
          onDragStarted={handleSplitPaneDragStart}
          onDragFinished={handleSplitPaneDragFinished}
        >
          <Pane className="Pane1">
            <ScrollSyncPane>{editor}</ScrollSyncPane>
          </Pane>
          <Pane className="Pane2">
            <ScrollSyncPane>{editor2}</ScrollSyncPane>
          </Pane>
        </StyledSplitPane>
      </SplitPaneWrapper>
    </ScrollSync>
  );

  const i18nVisible = collectionI18nEnabled && i18nVisibleState;
  const previewVisibleResolved = previewEnabled && previewVisible;
  const scrollSyncVisible = i18nVisible || previewVisibleResolved;

  const toolbarProps = {
    isPersisting: entry.isPersisting,
    isPublishing: (entry as any).isPublishing,
    isUpdatingStatus: (entry as any).isUpdatingStatus,
    isDeleting: (entry as any).isDeleting,
    onPersist: handleOnPersist,
    onPersistAndNew: () => handleOnPersist({ createNew: true }),
    onPersistAndDuplicate: () => handleOnPersist({ createNew: true, duplicate: true }),
    onDelete,
    onDeleteUnpublishedChanges,
    onChangeStatus,
    showDelete,
    onPublish,
    unPublish,
    onDuplicate,
    onPublishAndNew: () => handleOnPublish({ createNew: true }),
    onPublishAndDuplicate: () => handleOnPublish({ createNew: true, duplicate: true }),
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
  };

  return (
    <EditorContainer>
      {renderEditorToolbar
        ? renderEditorToolbar(toolbarProps as any)
        : React.createElement(EditorToolbar as any, { ...toolbarProps, t })}
      <Editor key={draftKey}>
        {(() => {
          const viewControlsProps = {
            i18nEnabled: !!collectionI18nEnabled,
            i18nVisible: !!i18nVisible,
            onToggleI18n: handleToggleI18n,
            previewEnabled: !!previewEnabled,
            previewVisible: !!previewVisibleResolved,
            onTogglePreview: handleTogglePreview,
            scrollSyncEnabled: !!scrollSyncEnabled,
            scrollSyncVisible: !!scrollSyncVisible && !(collection as any).editor?.visualEditing,
            onToggleScrollSync: handleToggleScrollSync,
          };
          if (renderEditorViewControls) {
            return renderEditorViewControls(viewControlsProps);
          }
          return (
            <ViewControls>
              {collectionI18nEnabled && (
                <EditorToggle
                  isActive={i18nVisible}
                  onClick={handleToggleI18n}
                  size="large"
                  type="page"
                  title={t('editor.editorInterface.toggleI18n')}
                />
              )}
              {previewEnabled && (
                <EditorToggle
                  isActive={previewVisibleResolved}
                  onClick={handleTogglePreview}
                  size="large"
                  type="eye"
                  title={t('editor.editorInterface.togglePreview')}
                />
              )}
              {scrollSyncVisible && !(collection as any).editor?.visualEditing && (
                <EditorToggle
                  isActive={scrollSyncEnabled}
                  onClick={handleToggleScrollSync}
                  size="large"
                  type="scroll"
                  title={t('editor.editorInterface.toggleScrollSync')}
                />
              )}
            </ViewControls>
          );
        })()}
        <EditorContent
          i18nVisible={!!i18nVisible}
          previewVisible={!!previewVisibleResolved}
          editor={editor}
          editorWithEditor={editorWithEditor}
          editorWithPreview={editorWithPreview}
        />
      </Editor>
    </EditorContainer>
  );
}

export default EditorInterface;
