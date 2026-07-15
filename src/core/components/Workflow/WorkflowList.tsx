/** @jsxImportSource @emotion/react */
import React from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import { translate } from 'react-polyglot';

import { colors, lengths } from '@/ui/default/index';
import { status } from '@/core/constants/publishModes';
import { DragSource, DropTarget, HTML5DragDrop } from '@/core/components/UI';
import WorkflowCard from './WorkflowCard';
import { selectEntryCollectionTitle } from '@/core/reducers/collections';
import { useCmsSlots } from '@/core/lib/slots';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const WorkflowListContainer = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: 33.3% 33.3% 33.3%;
`;

const WorkflowListContainerOpenAuthoring = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: 50% 50% 0%;
`;

const styles = {
  columnPosition: (idx: number) =>
    (idx === 0 &&
      css`
        margin-left: 0;
      `) ||
    (idx === 2 &&
      css`
        margin-right: 0;
      `) ||
    css`
      &:before,
      &:after {
        content: '';
        display: block;
        position: absolute;
        width: 2px;
        height: 80%;
        top: 76px;
        background-color: ${colors.textFieldBorder};
      }

      &:before {
        left: -23px;
      }

      &:after {
        right: -23px;
      }
    `,
  column: css`
    margin: 0 20px;
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
  hiddenRightBorder: css`
    &:not(:first-child:last-child) {
      &:after {
        display: none;
      }
    }
  `,
};

interface ColumnHeaderProps {
  $name?: string;
}

const ColumnHeader = styled.h2<ColumnHeaderProps>`
  font-size: 20px;
  font-weight: normal;
  padding: 4px 14px;
  border-radius: ${lengths.borderRadius};
  margin-bottom: 28px;

  ${(props: ColumnHeaderProps) =>
    props.$name === 'draft' &&
    css`
      background-color: ${colors.statusDraftBackground};
      color: ${colors.statusDraftText};
    `}

  ${(props: ColumnHeaderProps) =>
    props.$name === 'pending_review' &&
    css`
      background-color: ${colors.statusReviewBackground};
      color: ${colors.statusReviewText};
    `}

  ${(props: ColumnHeaderProps) =>
    props.$name === 'pending_publish' &&
    css`
      background-color: ${colors.statusReadyBackground};
      color: ${colors.statusReadyText};
    `}
`;

const ColumnCount = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text};
  text-transform: uppercase;
  margin-bottom: 6px;
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
}

function WorkflowList({
  entries,
  handleChangeStatus,
  handlePublish,
  handleDelete,
  t,
  isOpenAuthoring,
  collections,
}: WorkflowListProps) {
  const { renderWorkflowCard } = useCmsSlots();

  function onChangeStatus(newStatus: string, dragProps: DragProps) {
    handleChangeStatus(dragProps.collection, dragProps.slug, dragProps.ownStatus, newStatus);
  }

  function requestDelete(collection: string, slug: string, ownStatus: string) {
    if (window.confirm(t('workflow.workflowList.onDeleteEntry'))) {
      handleDelete(collection, slug, ownStatus);
    }
  }

  function requestPublish(collection: string, slug: string, ownStatus: string) {
    if (ownStatus !== Object.values(status).pop()) {
      window.alert(t('workflow.workflowList.onPublishingNotReadyEntry'));
      return;
    } else if (!window.confirm(t('workflow.workflowList.onPublishEntry'))) {
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
            onDrop={(dragProps: any) => onChangeStatus(currColumn, dragProps)}
          >
            {(connect: any, { isHovered }: { isHovered: boolean }) =>
              connect(
                <div style={{ height: '100%' }}>
                  <div
                    css={[
                      styles.column,
                      styles.columnPosition(idx),
                      isHovered && styles.columnHovered,
                      isOpenAuthoring && currColumn === 'pending_publish' && styles.hiddenColumn,
                      isOpenAuthoring &&
                        currColumn === 'pending_review' &&
                        styles.hiddenRightBorder,
                    ]}
                  >
                    <ColumnHeader $name={currColumn}>
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
              )
            }
          </DropTarget>
        ),
      );
    }
    return (
      <div>
        {entriesArg.map((entry: any) => {
          const timestamp = dayjs(entry.updatedOn).format(t('workflow.workflow.dateFormat'));
          const slug = entry.slug;
          const collectionName = entry.collection;
          const editLink = `/collections/${collectionName}/entries/${slug}?ref=workflow`;
          const ownStatus = entry.status;
          const collection = Object.values(collections).find(
            (c: CmsCollectionState) => c.name === collectionName,
          );
          const collectionLabel = collection?.label;
          const isModification = entry.isModification;

          const allowPublish = (collection?.publish ?? true) as boolean;
          const canPublish =
            ownStatus === Object.values(status).pop() && !(entry.isPersisting ?? false);
          const postAuthor = entry.author;

          return (
            <DragSource
              namespace={DNDNamespace}
              key={`${collectionName}-${slug}`}
              slug={slug}
              collection={collectionName}
              ownStatus={ownStatus}
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
                  allowPublish,
                  canPublish,
                  onPublish: () => requestPublish(collectionName, slug, ownStatus),
                  postAuthor,
                };
                return connect(
                  <div>
                    {renderWorkflowCard ? (
                      renderWorkflowCard(cardProps)
                    ) : (
                      <WorkflowCard {...cardProps} />
                    )}
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
  return <ListContainer>{columns}</ListContainer>;
}

export default HTML5DragDrop(translate()(WorkflowList as any));
