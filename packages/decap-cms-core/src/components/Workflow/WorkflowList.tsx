/** @jsxImportSource @emotion/react */
import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import dayjs from 'dayjs';
import { translate } from 'react-polyglot';
import { colors, lengths } from 'decap-cms-ui-default';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { Collections, Collection } from '../../types/cms';

import { status } from '../../constants/publishModes';
import { DragSource, DropTarget, HTML5DragDrop } from '../UI';
import WorkflowCard from './WorkflowCard';
import { selectEntryCollectionTitle } from '../../reducers/collections';

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
    &:not(:first-child):not(:last-child) {
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
  handleChangeStatus: (collection: string, slug: string, oldStatus: string, newStatus: string) => void;
  handlePublish: (collection: string, slug: string) => void;
  handleDelete: (collection: string, slug: string, status: string) => void;
  t: TranslateFunction;
  isOpenAuthoring?: boolean;
  collections: Collections;
}

class WorkflowList extends React.Component<WorkflowListProps> {
  static propTypes = {
    entries: ImmutablePropTypes.orderedMap,
    handleChangeStatus: PropTypes.func.isRequired,
    handlePublish: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    isOpenAuthoring: PropTypes.bool,
    collections: ImmutablePropTypes.map.isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(WorkflowList.propTypes, this.props, 'prop', 'WorkflowList');
  }

  handleChangeStatus = (newStatus: string, dragProps: DragProps) => {
    const slug = dragProps.slug;
    const collection = dragProps.collection;
    const oldStatus = dragProps.ownStatus;
    this.props.handleChangeStatus(collection, slug, oldStatus, newStatus);
  };

  requestDelete = (collection: string, slug: string, ownStatus: string) => {
    if (window.confirm(this.props.t('workflow.workflowList.onDeleteEntry'))) {
      this.props.handleDelete(collection, slug, ownStatus);
    }
  };

  requestPublish = (collection: string, slug: string, ownStatus: string) => {
    if (ownStatus !== status.last()) {
      window.alert(this.props.t('workflow.workflowList.onPublishingNotReadyEntry'));
      return;
    } else if (!window.confirm(this.props.t('workflow.workflowList.onPublishEntry'))) {
      return;
    }
    this.props.handlePublish(collection, slug);
  };

  // eslint-disable-next-line react/display-name
  renderColumns = (entries: any, column?: string): any => {
    const { isOpenAuthoring, collections, t } = this.props;
    if (!entries) return null;

    if (!column) {
      return entries.entrySeq().map(([currColumn, currEntries]: [string, any], idx: number) => (
        <DropTarget
          namespace={DNDNamespace}
          key={currColumn}
          onDrop={this.handleChangeStatus.bind(this, currColumn) as any}
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
                    isOpenAuthoring && currColumn === 'pending_review' && styles.hiddenRightBorder,
                  ]}
                >
                  <ColumnHeader $name={currColumn}>
                    {getColumnHeaderText(currColumn, this.props.t)}
                  </ColumnHeader>
                  <ColumnCount>
                    {this.props.t('workflow.workflowList.currentEntries', {
                      smart_count: currEntries.size,
                    })}
                  </ColumnCount>
                  {this.renderColumns(currEntries, currColumn)}
                </div>
              </div>,
            )
          }
        </DropTarget>
      ));
    }
    return (
      <div>
        {entries.map((entry: any) => {
          const timestamp = dayjs(entry.get('updatedOn')).format(t('workflow.workflow.dateFormat'));
          const slug = entry.get('slug');
          const collectionName = entry.get('collection');
          const editLink = `collections/${collectionName}/entries/${slug}?ref=workflow`;
          const ownStatus = entry.get('status');
          const collection = collections.find(
            (collection: Collection) => collection.get('name') === collectionName,
          );
          const collectionLabel = collection?.get('label');
          const isModification = entry.get('isModification');

          const allowPublish = (collection as any)?.get('publish');
          const canPublish = ownStatus === status.last() && !entry.get('isPersisting', false);
          const postAuthor = entry.get('author');

          return (
            <DragSource
              namespace={DNDNamespace}
              key={`${collectionName}-${slug}`}
              slug={slug}
              collection={collectionName}
              ownStatus={ownStatus}
            >
              {(connect: any) =>
                connect(
                  <div>
                    <WorkflowCard
                      collectionLabel={collectionLabel || collectionName}
                      title={selectEntryCollectionTitle(collection as Collection, entry)}
                      authorLastChange={entry.getIn(['metaData', 'user'])}
                      body={entry.getIn(['data', 'body'])}
                      isModification={isModification}
                      editLink={editLink}
                      timestamp={timestamp}
                      onDelete={this.requestDelete.bind(this, collectionName, slug, ownStatus)}
                      allowPublish={allowPublish}
                      canPublish={canPublish}
                      onPublish={this.requestPublish.bind(this, collectionName, slug, ownStatus)}
                      postAuthor={postAuthor}
                    />
                  </div>,
                )
              }
            </DragSource>
          );
        })}
      </div>
    );
  };

  render() {
    const columns = this.renderColumns(this.props.entries);
    const ListContainer = this.props.isOpenAuthoring
      ? WorkflowListContainerOpenAuthoring
      : WorkflowListContainer;
    return <ListContainer>{columns}</ListContainer>;
  }
}

export default HTML5DragDrop(translate()(WorkflowList as any));
