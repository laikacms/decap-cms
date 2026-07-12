/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { translate } from 'react-polyglot';

import { Dropdown, DropdownItem, Icon, colors, lengths, zIndex } from '../ui/default/index';
import { SettingsDropdown } from '../core/components/UI';
import { LaikaButton, LaikaBadge } from './ui';

import type { LaikaBadgeIntent } from './ui';
import type { TranslateFunction } from '../ui/default/index';
import type { EditorToolbarRenderProps } from '../app/components/index';

/**
 * Laika-styled editor toolbar. Slotted into core's `EditorInterface` via the
 * `renderEditorToolbar` slot — receives the full action bundle and renders
 * a flat top bar:
 *
 *   [← back]  [collection / title]                  [status] [save] [publish] [⋯]
 *
 * Built on `LaikaButton` + `LaikaBadge`. The "more actions" dropdown reuses
 * core's `Dropdown` primitive so the change-status / delete / open-preview
 * menu inherits the existing theme tokens.
 */

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: ${zIndex.zIndex300};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 20px;
  background-color: ${colors.foreground};
  border-bottom: 1px solid ${colors.textFieldBorder};
  min-height: ${lengths.topBarHeight};
`;

const LeftCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  color: ${colors.controlLabel};
  text-decoration: none;
  flex-shrink: 0;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
    outline: none;
  }
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${colors.controlLabel};
  min-width: 0;
`;

const CollectionLabel = styled(Link)`
  color: ${colors.controlLabel};
  text-decoration: none;
  font-weight: 500;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
    outline: none;
  }
`;

const Separator = styled.span`
  opacity: 0.5;
`;

const EntryLabel = styled.span`
  font-weight: 600;
  color: ${colors.textLead};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
`;

const RightCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const ChangesIndicator = styled.span<{ $changed: boolean }>`
  font-size: 12px;
  white-space: nowrap;
  color: ${({ $changed }) => ($changed ? colors.errorText : colors.controlLabel)};
`;

function workflowIntent(status: string | undefined): LaikaBadgeIntent {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'pending_review':
      return 'warning';
    case 'pending_publish':
      return 'success';
    default:
      return 'neutral';
  }
}

function workflowLabel(status: string | undefined, t: TranslateFunction): string {
  switch (status) {
    case 'draft':
      return t('editor.editorToolbar.draft');
    case 'pending_review':
      return t('editor.editorToolbar.inReview');
    case 'pending_publish':
      return t('editor.editorToolbar.ready');
    default:
      return status ?? '';
  }
}

interface LaikaEditorToolbarProps extends EditorToolbarRenderProps {
  t: TranslateFunction;
}

function LaikaEditorToolbar({
  collection,
  isPersisting,
  isPublishing,
  isUpdatingStatus,
  isDeleting,
  hasChanged,
  hasWorkflow,
  hasUnpublishedChanges,
  isNewEntry,
  isModification,
  currentStatus,
  onPersist,
  onPersistAndNew,
  onPersistAndDuplicate,
  onPublish,
  onPublishAndNew,
  onPublishAndDuplicate,
  onChangeStatus,
  unPublish,
  onDuplicate,
  onDelete,
  onDeleteUnpublishedChanges,
  showDelete,
  displayUrl,
  deployPreview,
  loadDeployPreview,
  user,
  onLogoutClick,
  editorBackLink,
  t,
}: LaikaEditorToolbarProps) {
  React.useEffect(() => {
    // The default toolbar lazily fetches the deploy preview on mount.
    // Mirror that here so the "View live" link is populated.
    if (deployPreview && !deployPreview.url && !deployPreview.isFetching) {
      loadDeployPreview({ maxAttempts: 3 });
    }
  }, [deployPreview, loadDeployPreview]);

  const canPublish =
    !!hasChanged === false && (!hasWorkflow || currentStatus === 'pending_publish');
  const showStatusControls = hasWorkflow && !isNewEntry;

  const saveLabel = isPersisting
    ? t('editor.editorToolbar.saving')
    : t('editor.editorToolbar.save');

  const publishLabel = isPublishing
    ? t('editor.editorToolbar.publishing')
    : isModification
      ? t('editor.editorToolbar.publishChanges')
      : t('editor.editorToolbar.publishNow');

  return (
    <Bar>
      <LeftCluster>
        <BackLink to={editorBackLink || `/collections/${collection.name}`} aria-label="Back">
          <Icon type="arrow" direction="left" />
        </BackLink>
        <Breadcrumb>
          <CollectionLabel to={`/collections/${collection.name}`}>
            {collection.label}
          </CollectionLabel>
          <Separator>/</Separator>
          <EntryLabel>{isNewEntry ? 'New entry' : 'Editing'}</EntryLabel>
        </Breadcrumb>
      </LeftCluster>

      <RightCluster>
        {showStatusControls && currentStatus ? (
          <LaikaBadge intent={workflowIntent(currentStatus)}>
            {workflowLabel(currentStatus, t)}
          </LaikaBadge>
        ) : null}

        <LaikaButton
          variant="secondary"
          size="sm"
          disabled={!hasChanged || isPersisting}
          onClick={() => onPersist()}
        >
          {saveLabel}
        </LaikaButton>

        {showStatusControls ? (
          <Dropdown
            renderButton={() => (
              <LaikaButton
                variant="ghost"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => undefined}
              >
                Set status
                <Icon type="chevron" direction="down" />
              </LaikaButton>
            )}
            dropdownTopOverlap="32px"
            dropdownWidth="180px"
            dropdownPosition="right"
          >
            <DropdownItem
              label={t('editor.editorToolbar.draft')}
              onClick={() => onChangeStatus('draft')}
              isActive={currentStatus === 'draft'}
            />
            <DropdownItem
              label={t('editor.editorToolbar.inReview')}
              onClick={() => onChangeStatus('pending_review')}
              isActive={currentStatus === 'pending_review'}
            />
            <DropdownItem
              label={t('editor.editorToolbar.ready')}
              onClick={() => onChangeStatus('pending_publish')}
              isActive={currentStatus === 'pending_publish'}
            />
          </Dropdown>
        ) : null}

        {(!hasWorkflow || canPublish) && !isNewEntry ? (
          <LaikaButton size="sm" disabled={isPublishing} onClick={() => onPublish()}>
            {publishLabel}
          </LaikaButton>
        ) : null}

        <Dropdown
          renderButton={() => (
            <LaikaButton variant="ghost" size="sm" aria-label="More actions">
              <Icon type="h-options" />
            </LaikaButton>
          )}
          dropdownTopOverlap="32px"
          dropdownWidth="220px"
          dropdownPosition="right"
        >
          {deployPreview?.url ? (
            <DropdownItem
              label={t('editor.editorToolbar.deployPreviewPendingButtonLabel')}
              onClick={() => {
                if (deployPreview.url) window.open(deployPreview.url, '_blank');
              }}
            />
          ) : null}
          <DropdownItem label={t('editor.editorToolbar.duplicate')} onClick={onDuplicate} />
          {hasUnpublishedChanges && hasWorkflow ? (
            <DropdownItem
              label={t('editor.editorToolbar.deleteUnpublishedChanges')}
              onClick={onDeleteUnpublishedChanges}
            />
          ) : null}
          {hasWorkflow && !isNewEntry ? (
            <DropdownItem label={t('editor.editorToolbar.unpublish')} onClick={unPublish} />
          ) : null}
          {showDelete ? (
            <DropdownItem
              label={
                isDeleting
                  ? t('editor.editorToolbar.deleting')
                  : t('editor.editorToolbar.deleteEntry')
              }
              onClick={onDelete}
            />
          ) : null}
        </Dropdown>

        <SettingsDropdown
          displayUrl={displayUrl}
          imageUrl={user?.avatar_url}
          onLogoutClick={onLogoutClick}
        />
      </RightCluster>
    </Bar>
  );
}

export default translate()(LaikaEditorToolbar);
