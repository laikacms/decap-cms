import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { Link } from 'react-router-dom';
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
} from 'decap-cms-ui-default';

import { status } from '../../constants/publishModes';
import { SettingsDropdown } from '../UI';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { Collection } from 'decap-cms-lib-util/types/cms-immutable';

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
  box-shadow: 0 2px 6px 0 rgb(68 74 87 / 0.05), 0 1px 3px 0 rgb(68 74 87 / 0.1),
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

export class EditorToolbar extends React.Component<EditorToolbarProps> {
  _pollController: AbortController | null = null;

  static propTypes = {
    isPersisting: PropTypes.bool,
    isPublishing: PropTypes.bool,
    isUpdatingStatus: PropTypes.bool,
    isDeleting: PropTypes.bool,
    onPersist: PropTypes.func.isRequired,
    onPersistAndNew: PropTypes.func.isRequired,
    onPersistAndDuplicate: PropTypes.func.isRequired,
    showDelete: PropTypes.bool.isRequired,
    onDelete: PropTypes.func.isRequired,
    onDeleteUnpublishedChanges: PropTypes.func.isRequired,
    onChangeStatus: PropTypes.func.isRequired,
    onPublish: PropTypes.func.isRequired,
    unPublish: PropTypes.func.isRequired,
    onDuplicate: PropTypes.func.isRequired,
    onPublishAndNew: PropTypes.func.isRequired,
    onPublishAndDuplicate: PropTypes.func.isRequired,
    user: PropTypes.object,
    hasChanged: PropTypes.bool,
    displayUrl: PropTypes.string,
    collection: ImmutablePropTypes.map.isRequired,
    hasWorkflow: PropTypes.bool,
    useOpenAuthoring: PropTypes.bool,
    hasUnpublishedChanges: PropTypes.bool,
    isNewEntry: PropTypes.bool,
    isModification: PropTypes.bool,
    currentStatus: PropTypes.string,
    onLogoutClick: PropTypes.func.isRequired,
    deployPreview: PropTypes.object,
    loadDeployPreview: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    editorBackLink: PropTypes.string.isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EditorToolbar.propTypes, this.props, 'prop', 'EditorToolbar');

    const { isNewEntry, loadDeployPreview } = this.props;
    if (!isNewEntry) {
      // 24 attempts × 5s interval = ~2 min polling window.
      // With editorial workflow, saving remounts the component (navigates to
      // the unpublished entry view), so componentDidMount is the primary
      // polling trigger — not componentDidUpdate.
      this._pollController = new AbortController();
      loadDeployPreview({ maxAttempts: 24, signal: this._pollController.signal });
    }
  }

  componentDidUpdate(prevProps: EditorToolbarProps) {
    const { isNewEntry, isPersisting, loadDeployPreview } = this.props;
    if (!isNewEntry && prevProps.isPersisting && !isPersisting) {
      // Abort any in-flight poll before starting a new one.
      this._pollController?.abort();
      this._pollController = new AbortController();
      // Fires on subsequent saves when the component survives (no remount).
      // In editorial workflow the first save remounts, so this mainly
      // covers the second-save-and-beyond case.
      loadDeployPreview({ maxAttempts: 3, signal: this._pollController.signal });
    }
  }

  componentWillUnmount() {
    this._pollController?.abort();
  }

  renderSimpleControls = () => {
    const { collection, hasChanged, isNewEntry, showDelete, onDelete, t } = this.props;
    const canCreate = collection.get('create');

    return (
      <>
        {!isNewEntry && !hasChanged
          ? this.renderExistingEntrySimplePublishControls({ canCreate })
          : this.renderNewEntrySimplePublishControls({ canCreate })}
        <div>
          {showDelete ? (
            <DeleteButton onClick={onDelete}>{t('editor.editorToolbar.deleteEntry')}</DeleteButton>
          ) : null}
        </div>
      </>
    );
  };

  renderDeployPreviewControls = (label: string) => {
    const { deployPreview = {}, loadDeployPreview, t } = this.props;
    const { url, status, isFetching } = deployPreview;

    if (!status) {
      return;
    }

    const deployPreviewReady = status === 'SUCCESS' && !isFetching;
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
  };

  renderStatusInfoTooltip = () => {
    const { t, currentStatus } = this.props;

    const statusToLocaleKey: Record<string, string> = {
      [status.get('DRAFT') as string]: 'statusInfoTooltipDraft',
      [status.get('PENDING_REVIEW') as string]: 'statusInfoTooltipInReview',
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
  };

  renderWorkflowStatusControls = () => {
    const { isUpdatingStatus, onChangeStatus, currentStatus, t, useOpenAuthoring } = this.props;

    const statusToTranslation: Record<string, string> = {
      [status.get('DRAFT') as string]: t('editor.editorToolbar.draft'),
      [status.get('PENDING_REVIEW') as string]: t('editor.editorToolbar.inReview'),
      [status.get('PENDING_PUBLISH') as string]: t('editor.editorToolbar.ready'),
    };

    const buttonText = isUpdatingStatus
      ? t('editor.editorToolbar.updating')
      : t('editor.editorToolbar.status', { status: currentStatus ? statusToTranslation[currentStatus] : '' });

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
            icon={currentStatus === status.get('DRAFT') ? 'check' : undefined}
          />
          <StatusDropdownItem
            label={t('editor.editorToolbar.inReview')}
            onClick={() => onChangeStatus('PENDING_REVIEW')}
            icon={currentStatus === status.get('PENDING_REVIEW') ? 'check' : undefined}
          />
          {useOpenAuthoring ? (
            ''
          ) : (
            <StatusDropdownItem
              label={t('editor.editorToolbar.ready')}
              onClick={() => onChangeStatus('PENDING_PUBLISH')}
              icon={currentStatus === status.get('PENDING_PUBLISH') ? 'check' : undefined}
            />
          )}
        </ToolbarDropdown>
        {useOpenAuthoring && this.renderStatusInfoTooltip()}
      </>
    );
  };

  renderNewEntryWorkflowPublishControls = ({ canCreate, canPublish }: { canCreate?: boolean; canPublish?: boolean }) => {
    const { isPublishing, onPublish, onPublishAndNew, onPublishAndDuplicate, t } = this.props;

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
  };

  renderExistingEntryWorkflowPublishControls = ({ canCreate, canPublish, canDelete }: { canCreate?: boolean; canPublish?: boolean; canDelete?: boolean }) => {
    const { unPublish, onDuplicate, isPersisting, t } = this.props;

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
  };

  renderExistingEntrySimplePublishControls = ({ canCreate }: { canCreate?: boolean }) => {
    const { onDuplicate, t } = this.props;
    return canCreate ? (
      <ToolbarDropdown
        dropdownTopOverlap="40px"
        dropdownWidth="max-content"
        renderButton={() => (
          <PublishedToolbarButton>{t('editor.editorToolbar.published')}</PublishedToolbarButton>
        )}
      >
        {
          <DropdownItem
            label={t('editor.editorToolbar.duplicate')}
            icon="add"
            onClick={onDuplicate}
          />
        }
      </ToolbarDropdown>
    ) : (
      <PublishedButton>{t('editor.editorToolbar.published')}</PublishedButton>
    );
  };

  renderNewEntrySimplePublishControls = ({ canCreate }: { canCreate?: boolean }) => {
    const { onPersist, onPersistAndNew, onPersistAndDuplicate, isPersisting, t } = this.props;

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
  };

  renderSimpleDeployPreviewControls = () => {
    const { hasChanged, isNewEntry, t } = this.props;

    if (!isNewEntry && !hasChanged) {
      return this.renderDeployPreviewControls(t('editor.editorToolbar.deployButtonLabel'));
    }
  };

  renderWorkflowControls = () => {
    const {
      onPersist,
      onDelete,
      onDeleteUnpublishedChanges,
      showDelete,
      hasChanged,
      hasUnpublishedChanges,
      useOpenAuthoring,
      isPersisting,
      isDeleting,
      isNewEntry,
      isModification,
      currentStatus,
      collection,
      t,
    } = this.props;

    const canCreate = collection.get('create');
    const canPublish = (collection as any).get('publish') && !useOpenAuthoring;
    const canDelete = collection.get('delete', true);

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
              {this.renderWorkflowStatusControls()}
              {!hasChanged && this.renderNewEntryWorkflowPublishControls({ canCreate, canPublish })}
            </React.Fragment>,
          ]
        : !isNewEntry && (
            <React.Fragment key="existing-entry-workflow-publish-controls">
              {this.renderExistingEntryWorkflowPublishControls({
                canCreate,
                canPublish,
                canDelete,
              })}
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
  };

  renderWorkflowDeployPreviewControls = () => {
    const { currentStatus, isNewEntry, t } = this.props;

    if (currentStatus) {
      return this.renderDeployPreviewControls(t('editor.editorToolbar.deployPreviewButtonLabel'));
    }

    /**
     * Publish control for published workflow entry.
     */
    if (!isNewEntry) {
      return this.renderDeployPreviewControls(t('editor.editorToolbar.deployButtonLabel'));
    }
  };

  render() {
    const {
      user,
      hasChanged,
      displayUrl,
      collection,
      hasWorkflow,
      onLogoutClick,
      t,
      editorBackLink,
    } = this.props;

    return (
      <ToolbarContainer>
        <ToolbarSectionBackLink to={editorBackLink}>
          <BackArrow>←</BackArrow>
          <div>
            <BackCollection>
              {t('editor.editorToolbar.backCollection', {
                collectionLabel: collection.get('label'),
              })}
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
            {hasWorkflow ? this.renderWorkflowControls() : this.renderSimpleControls()}
          </ToolbarSubSectionFirst>
          <ToolbarSubSectionLast>
            {hasWorkflow
              ? this.renderWorkflowDeployPreviewControls()
              : this.renderSimpleDeployPreviewControls()}
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
}

export default translate()(EditorToolbar);
