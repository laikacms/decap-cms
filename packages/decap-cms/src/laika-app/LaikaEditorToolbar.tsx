import styled from '@emotion/styled';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SettingsDropdown } from '@/core/components/UI';
import { useShortcut } from '@/core/hooks/useShortcut';
import { translate } from '@/core/i18n';
import { canEditCollection } from '@/core/lib/collectionAccess';
import { colors, Dropdown, DropdownButton, DropdownItem, Icon, lengths, zIndex } from '@/ui/default/index';
import { LAIKA_SHORTCUT_GROUPS } from './LaikaShortcuts';
import { LaikaBadge, LaikaButton } from './ui';

import type { EditorToolbarRenderProps } from '@/app/components/index';
import type { TranslateFunction } from '@/ui/default/index';
import type { LaikaBadgeIntent } from './ui';

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
 *
 * Registers the editor's keyboard shortcuts (mod+S save, mod+shift+P
 * publish, Escape back to the collection) for as long as it is mounted,
 * i.e. exactly while an entry is being edited.
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

/**
 * Ghost-styled trigger for the toolbar's `Dropdown`s, built on Base UI's
 * `Menu.Trigger` (via `DropdownButton`) so the click actually opens the
 * menu; plain `LaikaButton`s render fine but never hook into the
 * `Dropdown`'s open/close context (see `LaikaHeader`'s `QuickAddTrigger`
 * for the same pattern applied to a filled variant).
 */
const ToolbarDropdownButton = styled(DropdownButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  background-color: transparent;
  color: ${colors.controlLabel};
  border: 1px solid transparent;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    background-color: ${colors.activeBackground};
    color: ${colors.active};
  }

  &:disabled,
  &[data-disabled],
  &[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MoreActionsDropdownButton = styled(ToolbarDropdownButton)`
  width: 28px;
  padding: 0;
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

  const hasEditAccess = canEditCollection(collection, user?.scopes);
  const canPublish = hasEditAccess && !!hasChanged === false && (!hasWorkflow || currentStatus === 'pending_publish');
  const showStatusControls = hasEditAccess && hasWorkflow && !isNewEntry;
  const showPublish = hasEditAccess && (!hasWorkflow || (canPublish && !isNewEntry));
  const canCreate = hasEditAccess && !!collection.create;

  // A brand-new entry starts with `hasChanged: false` (DCMS-416, so a
  // freshly opened form doesn't show "unsaved changes" before the user types
  // anything). But that also disabled Save entirely, so a pristine new entry
  // could never be submitted to surface validation errors (#757). New
  // entries must stay saveable regardless of `hasChanged`; existing entries
  // still require a real change first.
  const canSave = hasEditAccess && (isNewEntry || !!hasChanged) && !isPersisting;

  const navigate = useNavigate();
  const backLink = editorBackLink || `/collections/${collection.name}`;

  useShortcut({
    id: 'laika.editor.save',
    sequence: 'mod+s',
    label: 'Save entry',
    group: LAIKA_SHORTCUT_GROUPS.editor,
    // mod combos already run in inputs by default; spelled out because the
    // whole point is saving mid-typing (and it beats the browser's dialog).
    allowInInput: true,
    run: () => {
      if (canSave) onPersist();
    },
  });

  useShortcut(
    showPublish
      ? {
        id: 'laika.editor.publish',
        sequence: 'mod+shift+p',
        label: 'Publish entry',
        group: LAIKA_SHORTCUT_GROUPS.editor,
        allowInInput: true,
        run: () => {
          if (!isPublishing) onPublish();
        },
      }
      : null,
  );

  useShortcut({
    id: 'laika.editor.back',
    sequence: 'escape',
    label: 'Back to collection',
    group: LAIKA_SHORTCUT_GROUPS.editor,
    // Deliberately not allowed in inputs: Escape while typing should stay
    // with the field (blur, close autocomplete), not navigate away.
    run: () => navigate(backLink),
  });

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
        {showStatusControls && currentStatus
          ? (
            <LaikaBadge intent={workflowIntent(currentStatus)}>
              {workflowLabel(currentStatus, t)}
            </LaikaBadge>
          )
          : null}

        <LaikaButton
          variant="secondary"
          size="sm"
          disabled={!canSave}
          onClick={() => onPersist()}
        >
          {saveLabel}
        </LaikaButton>

        <ChangesIndicator $changed={!!hasChanged} role="status">
          {hasChanged
            ? t('editor.editorToolbar.unsavedChanges')
            : t('editor.editorToolbar.changesSaved')}
        </ChangesIndicator>

        {showStatusControls
          ? (
            <Dropdown
              renderButton={() => (
                <ToolbarDropdownButton disabled={isUpdatingStatus}>
                  Set status
                  <Icon type="chevron" direction="down" />
                </ToolbarDropdownButton>
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
          )
          : null}

        {showPublish
          ? (
            <LaikaButton size="sm" disabled={isPublishing} onClick={() => onPublish()}>
              {publishLabel}
            </LaikaButton>
          )
          : null}

        <Dropdown
          renderButton={() => (
            <MoreActionsDropdownButton aria-label="More actions">
              <Icon type="h-options" />
            </MoreActionsDropdownButton>
          )}
          dropdownTopOverlap="32px"
          dropdownWidth="220px"
          dropdownPosition="right"
        >
          {deployPreview?.url
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.deployPreviewPendingButtonLabel')}
                onClick={() => {
                  if (deployPreview.url) window.open(deployPreview.url, '_blank');
                }}
              />
            )
            : null}
          {hasEditAccess
            ? <DropdownItem label={t('editor.editorToolbar.duplicate')} onClick={onDuplicate} />
            : null}
          {canCreate
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.saveAndCreateNew')}
                onClick={onPersistAndNew}
              />
            )
            : null}
          {canCreate
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.saveAndDuplicate')}
                onClick={onPersistAndDuplicate}
              />
            )
            : null}
          {canCreate && showPublish
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.publishAndCreateNew')}
                onClick={onPublishAndNew}
              />
            )
            : null}
          {canCreate && showPublish
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.publishAndDuplicate')}
                onClick={onPublishAndDuplicate}
              />
            )
            : null}
          {hasEditAccess && hasUnpublishedChanges && hasWorkflow
            ? (
              <DropdownItem
                label={t('editor.editorToolbar.deleteUnpublishedChanges')}
                onClick={onDeleteUnpublishedChanges}
              />
            )
            : null}
          {hasEditAccess && hasWorkflow && !isNewEntry
            ? <DropdownItem label={t('editor.editorToolbar.unpublish')} onClick={unPublish} />
            : null}
          {hasEditAccess && showDelete
            ? (
              <DropdownItem
                label={isDeleting
                  ? t('editor.editorToolbar.deleting')
                  : t('editor.editorToolbar.deleteEntry')}
                onClick={onDelete}
              />
            )
            : null}
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
