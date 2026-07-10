import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';

import { Link } from '../../routing/Link';
import {
  Icon,
  Dropdown,
  DropdownItem,
  StyledDropdownButton,
  colorsRaw,
  colors,
  components,
  buttons,
  zIndex,
} from '../../../ui/default/index';
import { status } from '../../constants/publishModes';
import { SettingsDropdown } from '../UI';

import type { TranslateFunction } from '../../../ui/default/index';
import type { CmsCollectionState } from '../../../lib/util/index';

type Collection = CmsCollectionState;

const styles = {
  noOverflow: css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  buttonMargin: css`
    margin: 0 10px;
  `,
  toolbarSection: css`
    height: 100%;
    display: flex;
    align-items: center;
    border: 0 solid ${colors.textFieldBorder};
  `,
  publishedButton: css`
    background-color: ${colorsRaw.tealLight};
    color: ${colorsRaw.tealDark};
  `,
};

const TooltipText = styled.div`
  visibility: hidden;
  width: 321px;
  background-color: #555;
  color: #fff;
  text-align: unset;
  border-radius: 6px;
  padding: 5px;

  /* Position the tooltip text */
  position: absolute;
  z-index: 1;
  top: 145%;
  left: 50%;
  margin-left: -320px;

  /* Fade in tooltip */
  opacity: 0;
  transition: opacity 0.3s;
`;

const Tooltip = styled.div`
  position: relative;
  display: inline-block;
  &:hover + ${TooltipText} {
    visibility: visible;
    opacity: 0.9;
  }
`;

const TooltipContainer = styled.div`
  position: relative;
`;

const DropdownButton = styled(StyledDropdownButton)`
  ${styles.noOverflow}
  @media (width >= 1200px) {
    padding-left: 10px;
  }
`;

const ToolbarContainer = styled.div`
  box-shadow:
    0 2px 6px 0 rgb(68 74 87 / 0.05),
    0 1px 3px 0 rgb(68 74 87 / 0.1),
    0 2px 54px rgb(0 0 0 / 0.1);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-width: 800px;
  z-index: ${zIndex.zIndex300};
  background-color: #fff;
  height: 66px;
  display: flex;
  justify-content: space-between;
`;

const ToolbarSectionMain = styled.div`
  ${styles.toolbarSection};
  flex: 10;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
`;

const ToolbarSubSectionFirst = styled.div`
  display: flex;
  align-items: center;
`;

const ToolbarSubSectionLast = styled(ToolbarSubSectionFirst)`
  justify-content: flex-end;
`;

const ToolbarSectionBackLink = styled(Link)`
  ${styles.toolbarSection};
  border-right-width: 1px;
  font-weight: normal;
  padding: 0 20px;

  &:hover,
  &:focus {
    background-color: #f1f2f4;
  }
`;

const ToolbarSectionMeta = styled.div`
  ${styles.toolbarSection};
  border-left-width: 1px;
  padding: 0 7px;
`;

const ToolbarDropdown = styled(Dropdown)`
  ${styles.buttonMargin};

  ${Icon} {
    color: ${colorsRaw.teal};
  }
`;

const BackArrow = styled.div`
  color: ${colors.textLead};
  font-size: 21px;
  font-weight: 600;
  margin-right: 16px;
`;

const BackCollection = styled.div`
  color: ${colors.textLead};
  font-size: 14px;
`;

const BackStatus = styled.div`
  margin-top: 6px;
`;

const BackStatusUnchanged = styled(BackStatus)`
  ${components.textBadgeSuccess};
`;

const BackStatusChanged = styled(BackStatus)`
  ${components.textBadgeDanger};
`;

const ToolbarButton = styled.button`
  ${buttons.button};
  ${buttons.default};
  ${styles.buttonMargin};
  ${styles.noOverflow};
  display: block;

  @media (width >= 1200px) {
    padding: 0 10px;
  }
`;

const DeleteButton = styled(ToolbarButton)`
  ${buttons.lightRed};
`;

const SaveButton = styled(ToolbarButton)`
  ${buttons.lightBlue};
  &[disabled] {
    ${buttons.disabled};
  }
`;

const PublishedToolbarButton = styled(DropdownButton)`
  ${styles.publishedButton}
`;

const PublishedButton = styled(ToolbarButton)`
  ${styles.publishedButton}
`;

const PublishButton = styled(DropdownButton)`
  background-color: ${colorsRaw.teal};
`;

const StatusButton = styled(DropdownButton)`
  background-color: ${colorsRaw.tealLight};
  color: ${colorsRaw.teal};
`;

const PreviewButtonContainer = styled.div`
  margin-right: 12px;
  color: ${colorsRaw.blue};
  display: flex;
  align-items: center;

  a,
  ${Icon} {
    color: ${colorsRaw.blue};
  }

  ${Icon} {
    position: relative;
    top: 1px;
  }
`;

const RefreshPreviewButton = styled.button<{ $spinning?: boolean }>`
  background: none;
  border: 0;
  cursor: pointer;
  color: ${colorsRaw.blue};

  span {
    margin-right: 6px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  ${Icon} {
    ${props => props.$spinning && `animation: spin 1s linear infinite;`}
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const PreviewLink = RefreshPreviewButton.withComponent('a');

const PublishDropDownItem = styled(DropdownItem)`
  min-width: initial;
`;

const StatusDropdownItem = styled(DropdownItem)`
  ${Icon} {
    color: ${colors.infoText};
  }
`;

interface EditorToolbarProps {
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
  collection: Collection;
  hasWorkflow?: boolean;
  useOpenAuthoring?: boolean;
  hasUnpublishedChanges?: boolean;
  isNewEntry?: boolean;
  isModification?: boolean;
  currentStatus?: string;
  onLogoutClick: () => void;
  deployPreview?: { url?: string; status?: string; isFetching?: boolean };
  loadDeployPreview: (opts?: { maxAttempts?: number; signal?: AbortSignal }) => void;
  t: TranslateFunction;
  editorBackLink: string;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    isNewEntry,
    isPersisting,
    isPublishing,
    isUpdatingStatus,
    isDeleting,
    isModification,
    hasChanged,
    hasUnpublishedChanges,
    useOpenAuthoring,
    currentStatus,
    showDelete,
    onPersist,
    onPersistAndNew,
    onPersistAndDuplicate,
    onPublish,
    onPublishAndNew,
    onPublishAndDuplicate,
    onChangeStatus,
    onDelete,
    onDeleteUnpublishedChanges,
    unPublish,
    onDuplicate,
    onLogoutClick,
    user,
    displayUrl,
    collection,
    hasWorkflow,
    deployPreview = {},
    loadDeployPreview,
    editorBackLink,
    t,
  } = props;

  const pollControllerRef = React.useRef<AbortController | null>(null);
  const isPersistingRef = React.useRef(isPersisting);
  const loadDeployPreviewRef = React.useRef(loadDeployPreview);
  loadDeployPreviewRef.current = loadDeployPreview;

  React.useEffect(() => {
    if (!isNewEntry) {
      // 24 attempts × 5s interval = ~2 min polling window.
      // With editorial workflow, saving remounts the component (navigates to
      // the unpublished entry view), so mount is the primary polling trigger.
      const controller = new AbortController();
      pollControllerRef.current = controller;
      loadDeployPreviewRef.current({ maxAttempts: 24, signal: controller.signal });
    }
    return () => {
      pollControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  React.useEffect(() => {
    if (!isNewEntry && isPersistingRef.current && !isPersisting) {
      // Abort any in-flight poll before starting a new one.
      pollControllerRef.current?.abort();
      const controller = new AbortController();
      pollControllerRef.current = controller;
      // Subsequent saves where the component survives (no remount).
      loadDeployPreviewRef.current({ maxAttempts: 3, signal: controller.signal });
    }
    isPersistingRef.current = isPersisting;
  }, [isPersisting, isNewEntry]);

  function renderDeployPreviewControls(label: string) {
    const { url, status: previewStatus, isFetching } = deployPreview;
    if (!previewStatus) return undefined;
    const deployPreviewReady = previewStatus === 'SUCCESS' && !isFetching;
    return (
      <PreviewButtonContainer>
        {deployPreviewReady ? (
          <PreviewLink rel="noopener noreferrer" target="_blank" href={url}>
            <span>{label}</span>
            <Icon type="new-tab" size="xsmall" />
          </PreviewLink>
        ) : (
          <RefreshPreviewButton
            onClick={() => loadDeployPreview()}
            disabled={isFetching}
            $spinning={isFetching}
          >
            <span>{t('editor.editorToolbar.deployPreviewPendingButtonLabel')}</span>
            <Icon type="refresh" size="xsmall" />
          </RefreshPreviewButton>
        )}
      </PreviewButtonContainer>
    );
  }

  function renderStatusInfoTooltip() {
    const statusToLocaleKey: Record<string, string> = {
      [status.DRAFT]: 'statusInfoTooltipDraft',
      [status.PENDING_REVIEW]: 'statusInfoTooltipInReview',
    };
    const statusKey = Object.keys(statusToLocaleKey).find(key => key === currentStatus);
    return (
      <TooltipContainer>
        <Tooltip>
          <Icon type="info-circle" size="small" className="tooltip" />
        </Tooltip>
        {statusKey && (
          <TooltipText>{t(`editor.editorToolbar.${statusToLocaleKey[statusKey]}`)}</TooltipText>
        )}
      </TooltipContainer>
    );
  }

  function renderWorkflowStatusControls() {
    const statusToTranslation: Record<string, string> = {
      [status.DRAFT]: t('editor.editorToolbar.draft'),
      [status.PENDING_REVIEW]: t('editor.editorToolbar.inReview'),
      [status.PENDING_PUBLISH]: t('editor.editorToolbar.ready'),
    };
    const buttonText = isUpdatingStatus
      ? t('editor.editorToolbar.updating')
      : t('editor.editorToolbar.status', {
          status: currentStatus ? statusToTranslation[currentStatus] : '',
        });
    return (
      <>
        <ToolbarDropdown
          dropdownTopOverlap="40px"
          dropdownWidth="120px"
          renderButton={() => <StatusButton>{buttonText}</StatusButton>}
        >
          <StatusDropdownItem
            label={t('editor.editorToolbar.draft')}
            onClick={() => onChangeStatus('DRAFT')}
            icon={currentStatus === status.DRAFT ? 'check' : undefined}
          />
          <StatusDropdownItem
            label={t('editor.editorToolbar.inReview')}
            onClick={() => onChangeStatus('PENDING_REVIEW')}
            icon={currentStatus === status.PENDING_REVIEW ? 'check' : undefined}
          />
          {useOpenAuthoring ? (
            ''
          ) : (
            <StatusDropdownItem
              label={t('editor.editorToolbar.ready')}
              onClick={() => onChangeStatus('PENDING_PUBLISH')}
              icon={currentStatus === status.PENDING_PUBLISH ? 'check' : undefined}
            />
          )}
        </ToolbarDropdown>
        {useOpenAuthoring && renderStatusInfoTooltip()}
      </>
    );
  }

  function renderNewEntryWorkflowPublishControls({
    canCreate,
    canPublish,
  }: {
    canCreate?: boolean;
    canPublish?: boolean;
  }) {
    return canPublish ? (
      <ToolbarDropdown
        dropdownTopOverlap="40px"
        dropdownWidth="200px"
        renderButton={() => (
          <PublishButton>
            {isPublishing
              ? t('editor.editorToolbar.publishing')
              : t('editor.editorToolbar.publish')}
          </PublishButton>
        )}
      >
        <PublishDropDownItem
          label={t('editor.editorToolbar.publishNow')}
          icon="arrow"
          iconDirection="right"
          onClick={onPublish}
        />
        {canCreate ? (
          <>
            <PublishDropDownItem
              label={t('editor.editorToolbar.publishAndCreateNew')}
              icon="add"
              onClick={onPublishAndNew}
            />
            <PublishDropDownItem
              label={t('editor.editorToolbar.publishAndDuplicate')}
              icon="add"
              onClick={onPublishAndDuplicate}
            />
          </>
        ) : null}
      </ToolbarDropdown>
    ) : (
      ''
    );
  }

  function renderExistingEntryWorkflowPublishControls({
    canCreate,
    canPublish,
    canDelete,
  }: {
    canCreate?: boolean;
    canPublish?: boolean;
    canDelete?: boolean;
  }) {
    return canPublish || canCreate ? (
      <ToolbarDropdown
        dropdownTopOverlap="40px"
        dropdownWidth="max-content"
        key="td-publish-create"
        renderButton={() => (
          <PublishedToolbarButton>
            {isPersisting
              ? t('editor.editorToolbar.unpublishing')
              : t('editor.editorToolbar.published')}
          </PublishedToolbarButton>
        )}
      >
        {canDelete && canPublish && (
          <DropdownItem
            label={t('editor.editorToolbar.unpublish')}
            icon="arrow"
            iconDirection="right"
            onClick={unPublish}
          />
        )}
        {canCreate && (
          <DropdownItem
            label={t('editor.editorToolbar.duplicate')}
            icon="add"
            onClick={onDuplicate}
          />
        )}
      </ToolbarDropdown>
    ) : (
      ''
    );
  }

  function renderExistingEntrySimplePublishControls({ canCreate }: { canCreate?: boolean }) {
    return canCreate ? (
      <ToolbarDropdown
        dropdownTopOverlap="40px"
        dropdownWidth="max-content"
        renderButton={() => (
          <PublishedToolbarButton>{t('editor.editorToolbar.published')}</PublishedToolbarButton>
        )}
      >
        <DropdownItem
          label={t('editor.editorToolbar.duplicate')}
          icon="add"
          onClick={onDuplicate}
        />
      </ToolbarDropdown>
    ) : (
      <PublishedButton>{t('editor.editorToolbar.published')}</PublishedButton>
    );
  }

  function renderNewEntrySimplePublishControls({ canCreate }: { canCreate?: boolean }) {
    return (
      <div>
        <ToolbarDropdown
          dropdownTopOverlap="40px"
          dropdownWidth="max-content"
          renderButton={() => (
            <PublishButton>
              {isPersisting
                ? t('editor.editorToolbar.publishing')
                : t('editor.editorToolbar.publish')}
            </PublishButton>
          )}
        >
          <DropdownItem
            label={t('editor.editorToolbar.publishNow')}
            icon="arrow"
            iconDirection="right"
            onClick={onPersist}
          />
          {canCreate ? (
            <>
              <DropdownItem
                label={t('editor.editorToolbar.publishAndCreateNew')}
                icon="add"
                onClick={onPersistAndNew}
              />
              <DropdownItem
                label={t('editor.editorToolbar.publishAndDuplicate')}
                icon="add"
                onClick={onPersistAndDuplicate}
              />
            </>
          ) : null}
        </ToolbarDropdown>
      </div>
    );
  }

  function renderSimpleControls() {
    const canCreate = collection.create;
    return (
      <>
        {!isNewEntry && !hasChanged
          ? renderExistingEntrySimplePublishControls({ canCreate })
          : renderNewEntrySimplePublishControls({ canCreate })}
        <div>
          {showDelete ? (
            <DeleteButton onClick={onDelete}>{t('editor.editorToolbar.deleteEntry')}</DeleteButton>
          ) : null}
        </div>
      </>
    );
  }

  function renderSimpleDeployPreviewControls() {
    if (!isNewEntry && !hasChanged) {
      return renderDeployPreviewControls(t('editor.editorToolbar.deployButtonLabel'));
    }
  }

  function renderWorkflowControls() {
    const canCreate = collection.create;
    const canPublish = !!(collection.publish && !useOpenAuthoring);
    const canDelete = collection.delete ?? true;

    const deleteLabel =
      (hasUnpublishedChanges &&
        isModification &&
        t('editor.editorToolbar.deleteUnpublishedChanges')) ||
      (hasUnpublishedChanges &&
        (isNewEntry || !isModification) &&
        t('editor.editorToolbar.deleteUnpublishedEntry')) ||
      (!hasUnpublishedChanges && !isModification && t('editor.editorToolbar.deletePublishedEntry'));

    return [
      <SaveButton
        disabled={!hasChanged}
        key="save-button"
        onClick={() => hasChanged && onPersist()}
      >
        {isPersisting ? t('editor.editorToolbar.saving') : t('editor.editorToolbar.save')}
      </SaveButton>,
      currentStatus
        ? [
            <React.Fragment key="workflow-status-controls">
              {renderWorkflowStatusControls()}
              {!hasChanged && renderNewEntryWorkflowPublishControls({ canCreate, canPublish })}
            </React.Fragment>,
          ]
        : !isNewEntry && (
            <React.Fragment key="existing-entry-workflow-publish-controls">
              {renderExistingEntryWorkflowPublishControls({ canCreate, canPublish, canDelete })}
            </React.Fragment>
          ),
      (!showDelete || useOpenAuthoring) && !hasUnpublishedChanges && !isModification ? null : (
        <DeleteButton
          key="delete-button"
          onClick={hasUnpublishedChanges ? onDeleteUnpublishedChanges : onDelete}
        >
          {isDeleting ? t('editor.editorToolbar.deleting') : deleteLabel}
        </DeleteButton>
      ),
    ];
  }

  function renderWorkflowDeployPreviewControls() {
    if (currentStatus) {
      return renderDeployPreviewControls(t('editor.editorToolbar.deployPreviewButtonLabel'));
    }
    if (!isNewEntry) {
      return renderDeployPreviewControls(t('editor.editorToolbar.deployButtonLabel'));
    }
  }

  return (
    <ToolbarContainer>
      <ToolbarSectionBackLink to={editorBackLink}>
        <BackArrow>←</BackArrow>
        <div>
          <BackCollection>
            {t('editor.editorToolbar.backCollection', { collectionLabel: collection.label })}
          </BackCollection>
          {hasChanged ? (
            <BackStatusChanged>{t('editor.editorToolbar.unsavedChanges')}</BackStatusChanged>
          ) : (
            <BackStatusUnchanged>{t('editor.editorToolbar.changesSaved')}</BackStatusUnchanged>
          )}
        </div>
      </ToolbarSectionBackLink>
      <ToolbarSectionMain>
        <ToolbarSubSectionFirst>
          {hasWorkflow ? renderWorkflowControls() : renderSimpleControls()}
        </ToolbarSubSectionFirst>
        <ToolbarSubSectionLast>
          {hasWorkflow
            ? renderWorkflowDeployPreviewControls()
            : renderSimpleDeployPreviewControls()}
        </ToolbarSubSectionLast>
      </ToolbarSectionMain>
      <ToolbarSectionMeta>
        <SettingsDropdown
          displayUrl={displayUrl}
          imageUrl={user?.avatar_url}
          onLogoutClick={onLogoutClick}
        />
      </ToolbarSectionMeta>
    </ToolbarContainer>
  );
}

export default translate()(EditorToolbar);
