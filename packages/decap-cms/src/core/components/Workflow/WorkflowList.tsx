import { css } from '@emotion/react';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import React from 'react';

import { DragSource, DropTarget, HTML5DragDrop } from '@/core/components/UI';
import { status } from '@/core/constants/publishModes';
import { translate } from '@/core/i18n';
import { canEditCollection } from '@/core/lib/collectionAccess';
import { useCmsSlots } from '@/core/lib/slots';
import { selectEntryCollectionTitle } from '@/core/reducers/collections';
import { confirmDialog, showAlert } from '@/ui';
import { buttons, colors, lengths } from '@/ui/default/index';
import WorkflowCard from './WorkflowCard';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const WorkflowListContainer = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  @media (min-width: 500px) {
    gap: 14px;
  }
  @media (min-width: 800px) {
    gap: 40px;
  }
`;

const WorkflowListContainerOpenAuthoring = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  @media (min-width: 500px) {
    gap: 14px;
  }
  @media (min-width: 800px) {
    gap: 40px;
  }
`;

const styles = {
  columnPosition: (idx: number) =>
    idx > 0
    && css`
      &:before {
        content: '';
        display: block;
        position: absolute;
        width: 2px;
        height: 80%;
        top: 36px;
        background-color: ${colors.textFieldBorder};
        @media (min-width: 800px) {
          top: 76px;
        }
      }

      &:before {
        left: -7px;
        @media (min-width: 500px) {
          left: -10px;
        }
        @media (min-width: 800px) {
          left: -23px;
        }
      }
    `,
  column: css`
    transition: background-color 0.5s ease;
    border: 2px dashed transparent;
    border-radius: 4px;
    position: relative;
    height: 100%;
  `,
  columnHovered: css`
    border-color: ${colors.active};
  `,
  hiddenColumn: css`
    display: none;
  `,
};

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const StatusActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 4px 18px 18px;
`;

const StatusActionButton = styled.button`
  ${buttons.button};
  flex: 1 0 0;
  font-size: 12px;
  padding: 6px 0;

  &[disabled] {
    ${buttons.disabled};
  }
`;

interface ColumnHeaderProps {
  $name?: string;
}

const ColumnHeader = styled.h2<ColumnHeaderProps>`
  font-size: 16px;
  font-weight: normal;
  padding: 2px 6px;
  border-radius: ${lengths.borderRadius};
  white-space: nowrap;
  margin-bottom: 6px;

  @media (min-width: 800px) {
    font-size: 20px;
    padding: 4px 12px;
    margin-bottom: 28px;
  }

  ${(props: ColumnHeaderProps) =>
  props.$name === 'draft'
  && css`
      background-color: ${colors.statusDraftBackground};
      color: ${colors.statusDraftText};
    `}

  ${(props: ColumnHeaderProps) =>
  props.$name === 'pending_review'
  && css`
      background-color: ${colors.statusReviewBackground};
      color: ${colors.statusReviewText};
    `}

  ${(props: ColumnHeaderProps) =>
  props.$name === 'pending_publish'
  && css`
      background-color: ${colors.statusReadyBackground};
      color: ${colors.statusReadyText};
    `}
`;

const ColumnCount = styled.p`
  font-size: 11px;
  font-weight: 500;
  color: ${colors.text};
  text-transform: uppercase;
  margin-bottom: 6px;
  padding-inline: 6px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  min-width: 0;

  @media (min-width: 800px) {
    font-size: 13px;
    padding-inline: 12px;
  }
`;

// This is a namespace so that we can only drop these elements on a DropTarget with the same
const DNDNamespace = 'cms-workflow';

function getColumnHeaderText(columnName: string, t: TranslateFunction) {
  switch (columnName) {
    case 'draft':
      return t('workflow.workflowList.draftHeader');
    case 'pending_review':
      return t('workflow.workflowList.inReviewHeader');
    case 'pending_publish':
      return t('workflow.workflowList.readyHeader');
  }
}

// Columns are ordered Draft -> Review -> Ready; keyboard "move to
// previous/next status" steps one position along this same order.
const STATUS_ORDER = Object.values(status);

function getAdjacentStatus(currentStatus: string, direction: -1 | 1): string | undefined {
  const index = STATUS_ORDER.indexOf(currentStatus as (typeof STATUS_ORDER)[number]);
  if (index === -1) return undefined;
  const adjacentIndex = index + direction;
  if (adjacentIndex < 0 || adjacentIndex >= STATUS_ORDER.length) return undefined;
  return STATUS_ORDER[adjacentIndex];
}

interface DragProps {
  slug: string;
  collection: string;
  ownStatus: string;
}

interface WorkflowListProps {
  entries?: any;
  handleChangeStatus: (
    collection: string,
    slug: string,
    oldStatus: string,
    newStatus: string,
  ) => void;
  handlePublish: (collection: string, slug: string) => void;
  handleDelete: (collection: string, slug: string, status: string) => void;
  t: TranslateFunction;
  isOpenAuthoring?: boolean;
  collections: CmsCollections;
  userScopes?: string[];
}

function WorkflowList({
  entries,
  handleChangeStatus,
  handlePublish,
  handleDelete,
  t,
  isOpenAuthoring,
  collections,
  userScopes,
}: WorkflowListProps) {
  const { renderWorkflowCard } = useCmsSlots();
  // Announces every status change (keyboard-driven or drag-and-drop) via the
  // shared `onChangeStatus` dispatch path below, satisfying AC5 without a
  // second code path.
  const [announcement, setAnnouncement] = React.useState('');

  function onChangeStatus(newStatus: string, dragProps: DragProps) {
    handleChangeStatus(dragProps.collection, dragProps.slug, dragProps.ownStatus, newStatus);
    setAnnouncement(
      t('workflow.workflowList.movedAnnouncement', {
        slug: dragProps.slug,
        status: getColumnHeaderText(newStatus, t),
      }),
    );
  }

  async function requestDelete(collection: string, slug: string, ownStatus: string) {
    if (
      await confirmDialog(t('workflow.workflowList.onDeleteEntry'), {
        title: t('workflow.workflowList.onDeleteEntryTitle'),
      })
    ) {
      handleDelete(collection, slug, ownStatus);
    }
  }

  async function requestPublish(collection: string, slug: string, ownStatus: string) {
    if (ownStatus !== Object.values(status).pop()) {
      showAlert(t('workflow.workflowList.onPublishingNotReadyEntry'), {
        title: t('workflow.workflowList.onPublishingNotReadyEntryTitle'),
      });
      return;
    } else if (
      !(await confirmDialog(t('workflow.workflowList.onPublishEntry'), {
        title: t('workflow.workflowList.onPublishEntryTitle'),
      }))
    ) {
      return;
    }
    handlePublish(collection, slug);
  }

  function renderColumns(entriesArg: any, column?: string): any {
    if (!entriesArg) return null;

    if (!column) {
      return Object.entries(entriesArg).map(
        ([currColumn, currEntries]: [string, any], idx: number) => (
          <DropTarget
            namespace={DNDNamespace}
            key={currColumn}
            onDrop={(dragProps: any) => {
              const collection = collections[dragProps.collection];
              if (collection && canEditCollection(collection, userScopes)) {
                onChangeStatus(currColumn, dragProps);
              }
            }}
          >
            {(connect: any, { isHovered }: { isHovered: boolean }) =>
              connect(
                <div style={{ height: '100%' }}>
                  <div
                    role="region"
                    aria-labelledby={`workflow-column-heading-${currColumn}`}
                    css={[
                      styles.column,
                      styles.columnPosition(idx),
                      isHovered && styles.columnHovered,
                      isOpenAuthoring && currColumn === 'pending_publish' && styles.hiddenColumn,
                    ]}
                  >
                    <ColumnHeader id={`workflow-column-heading-${currColumn}`} $name={currColumn}>
                      {getColumnHeaderText(currColumn, t)}
                    </ColumnHeader>
                    <ColumnCount>
                      {t('workflow.workflowList.currentEntries', {
                        smart_count: Array.isArray(currEntries) ? currEntries.length : 0,
                      })}
                    </ColumnCount>
                    {renderColumns(currEntries, currColumn)}
                  </div>
                </div>,
              )}
          </DropTarget>
        ),
      );
    }
    return (
      <div role="list">
        {entriesArg.map((entry: any) => {
          const timestamp = dayjs(entry.updatedOn).format(t('workflow.workflow.dateFormat'));
          const slug = entry.slug;
          const collectionName = entry.collection;
          // Must be absolute: the router matches anchored paths and (unlike the
          // react-router-era history@4) does not resolve relative pushes.
          const editLink = `/collections/${collectionName}/entries/${slug}?ref=workflow`;
          const ownStatus = entry.status;
          const collection = Object.values(collections).find(
            (c: CmsCollectionState) => c.name === collectionName,
          );
          const collectionLabel = collection?.label;
          const hasEditAccess = !!collection && canEditCollection(collection, userScopes);
          const isModification = entry.isModification;

          const allowPublish = hasEditAccess && ((collection?.publish ?? true) as boolean);
          const canPublish = hasEditAccess
            && ownStatus === Object.values(status).pop()
            && !(entry.isPersisting ?? false);
          const postAuthor = entry.author;
          const previousStatus = getAdjacentStatus(ownStatus, -1);
          const nextStatus = getAdjacentStatus(ownStatus, 1);

          function moveTo(newStatus: string | undefined) {
            if (!newStatus || !hasEditAccess) return;
            onChangeStatus(newStatus, { slug, collection: collectionName, ownStatus });
          }

          return (
            <DragSource
              namespace={DNDNamespace}
              key={`${collectionName}-${slug}`}
              slug={slug}
              collection={collectionName}
              ownStatus={ownStatus}
              canDrag={hasEditAccess}
            >
              {(connect: any) => {
                const cardProps = {
                  collectionLabel: collectionLabel || collectionName,
                  title: selectEntryCollectionTitle(collection as CmsCollectionState, entry),
                  authorLastChange: entry.metaData?.user,
                  body: entry.data?.body,
                  isModification,
                  editLink,
                  timestamp,
                  onDelete: () => requestDelete(collectionName, slug, ownStatus),
                  canDelete: hasEditAccess,
                  allowPublish,
                  canPublish,
                  onPublish: () => requestPublish(collectionName, slug, ownStatus),
                  postAuthor,
                };
                return connect(
                  <div
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${cardProps.collectionLabel}: ${cardProps.title} (${
                      getColumnHeaderText(ownStatus, t)
                    })`}
                  >
                    {renderWorkflowCard
                      ? (
                        renderWorkflowCard(cardProps)
                      )
                      : <WorkflowCard {...cardProps} />}
                    <StatusActions>
                      <StatusActionButton
                        type="button"
                        disabled={!hasEditAccess || !previousStatus}
                        onClick={() => moveTo(previousStatus)}
                        aria-label={previousStatus
                          ? t('workflow.workflowList.moveToPreviousStatus', {
                            status: getColumnHeaderText(previousStatus, t),
                          })
                          : t('workflow.workflowList.moveToPreviousStatusShort')}
                      >
                        {t('workflow.workflowList.moveToPreviousStatusShort')}
                      </StatusActionButton>
                      <StatusActionButton
                        type="button"
                        disabled={!hasEditAccess || !nextStatus}
                        onClick={() => moveTo(nextStatus)}
                        aria-label={nextStatus
                          ? t('workflow.workflowList.moveToNextStatus', {
                            status: getColumnHeaderText(nextStatus, t),
                          })
                          : t('workflow.workflowList.moveToNextStatusShort')}
                      >
                        {t('workflow.workflowList.moveToNextStatusShort')}
                      </StatusActionButton>
                    </StatusActions>
                  </div>,
                );
              }}
            </DragSource>
          );
        })}
      </div>
    );
  }

  const columns = renderColumns(entries);
  const ListContainer = isOpenAuthoring
    ? WorkflowListContainerOpenAuthoring
    : WorkflowListContainer;
  return (
    <>
      <span role="status" aria-live="polite" style={visuallyHiddenStyle}>
        {announcement}
      </span>
      <ListContainer>{columns}</ListContainer>
    </>
  );
}

export default HTML5DragDrop(translate()(WorkflowList as any));
