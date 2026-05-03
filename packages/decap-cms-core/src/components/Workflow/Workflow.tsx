import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from '@emotion/styled';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { CmsCollections, CmsCollectionState } from 'decap-cms-lib-util';
import type { Status } from '../../constants/publishModes';
import { translate } from 'react-polyglot';
import { connect } from 'react-redux';
import {
  Dropdown,
  DropdownItem,
  StyledDropdownButton,
  Loader,
  lengths,
  components,
  shadows,
} from 'decap-cms-ui-default';

type Collections = CmsCollections;
type Collection = CmsCollectionState;

type State = any;

import { createNewEntry } from '../../actions/collections';
import {
  loadUnpublishedEntries,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  deleteUnpublishedEntry,
} from '../../actions/editorialWorkflow';
import { selectUnpublishedEntriesByStatus } from '../../reducers';
import { EDITORIAL_WORKFLOW, status } from '../../constants/publishModes';
import WorkflowList from './WorkflowList';

const WorkflowContainer = styled.div`
  padding: ${lengths.pageMargin} 0;
  height: 100vh;
`;

const WorkflowTop = styled.div`
  ${components.cardTop};
`;

const WorkflowTopRow = styled.div`
  display: flex;
  justify-content: space-between;

  span[role='button'] {
    ${shadows.dropDeep};
  }
`;

const WorkflowTopHeading = styled.h1`
  ${components.cardTopHeading};
`;

const WorkflowTopDescription = styled.p`
  ${components.cardTopDescription};
`;

interface WorkflowProps {
  collections: Collections;
  isEditorialWorkflow: boolean;
  isOpenAuthoring?: boolean;
  isFetching?: boolean;

  unpublishedEntries?: Record<string, any>;
  loadUnpublishedEntries: (collections: Collections) => void;
  updateUnpublishedEntryStatus: (
    collection: string,
    slug: string,
    oldStatus: string,
    newStatus: string,
  ) => void;
  publishUnpublishedEntry: (collection: string, slug: string) => void;
  deleteUnpublishedEntry: (collection: string, slug: string) => void;
  t: TranslateFunction;
}

class Workflow extends Component<WorkflowProps> {
  static propTypes = {
    collections: PropTypes.object.isRequired,
    isEditorialWorkflow: PropTypes.bool.isRequired,
    isOpenAuthoring: PropTypes.bool,
    isFetching: PropTypes.bool,
    unpublishedEntries: PropTypes.object,
    loadUnpublishedEntries: PropTypes.func.isRequired,
    updateUnpublishedEntryStatus: PropTypes.func.isRequired,
    publishUnpublishedEntry: PropTypes.func.isRequired,
    deleteUnpublishedEntry: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(Workflow.propTypes, this.props, 'prop', 'Workflow');

    const { loadUnpublishedEntries, isEditorialWorkflow, collections } = this.props;
    if (isEditorialWorkflow) {
      loadUnpublishedEntries(collections);
    }
  }

  render() {
    const {
      isEditorialWorkflow,
      isOpenAuthoring,
      isFetching,
      unpublishedEntries,
      updateUnpublishedEntryStatus,
      publishUnpublishedEntry,
      deleteUnpublishedEntry,
      collections,
      t,
    } = this.props;

    if (!isEditorialWorkflow) return null;
    if (isFetching) return <Loader active>{t('workflow.workflow.loading')}</Loader>;
    const reviewCount = unpublishedEntries
      ? (unpublishedEntries['pending_review']?.length ?? 0)
      : 0;
    const readyCount = unpublishedEntries
      ? (unpublishedEntries['pending_publish']?.length ?? 0)
      : 0;

    return (
      <WorkflowContainer>
        <WorkflowTop>
          <WorkflowTopRow>
            <WorkflowTopHeading>{t('workflow.workflow.workflowHeading')}</WorkflowTopHeading>
            <Dropdown
              dropdownWidth="160px"
              dropdownPosition="left"
              dropdownTopOverlap="40px"
              renderButton={() => (
                <StyledDropdownButton>{t('workflow.workflow.newPost')}</StyledDropdownButton>
              )}
            >
              {Object.values(collections)
                .filter((collection: Collection) => !!collection.create)
                .map((collection: Collection) => (
                  <DropdownItem
                    key={collection.name}
                    label={collection.label}
                    onClick={() => createNewEntry(collection.name)}
                  />
                ))}
            </Dropdown>
          </WorkflowTopRow>
          <WorkflowTopDescription>
            {t('workflow.workflow.description', {
              smart_count: reviewCount,
              readyCount,
            })}
          </WorkflowTopDescription>
        </WorkflowTop>
        {React.createElement(WorkflowList as any, {
          entries: unpublishedEntries,
          handleChangeStatus: updateUnpublishedEntryStatus,
          handlePublish: publishUnpublishedEntry,
          handleDelete: deleteUnpublishedEntry,
          isOpenAuthoring,
          collections,
        })}
      </WorkflowContainer>
    );
  }
}

function mapStateToProps(state: State) {
  const { collections, config, globalUI } = state;
  const isEditorialWorkflow = config.publish_mode === EDITORIAL_WORKFLOW;
  const isOpenAuthoring = globalUI.useOpenAuthoring;

  const returnObj: {
    collections: Collections;
    isEditorialWorkflow: boolean;

    isOpenAuthoring: any;
    isFetching?: boolean;

    unpublishedEntries?: Record<string, any>;
  } = { collections, isEditorialWorkflow, isOpenAuthoring };

  if (isEditorialWorkflow) {
    returnObj.isFetching = state.editorialWorkflow?.pages?.isFetching ?? false;

    /*
     * Generates a plain object of the available status as keys.
     * Each key containing an array of available unpublished entries
     */

    const unpublishedEntries: Record<string, any> = {};
    Object.values(status).forEach(currStatus => {
      const entries = selectUnpublishedEntriesByStatus(state, currStatus as Status);
      unpublishedEntries[currStatus as string] = entries;
    });
    returnObj.unpublishedEntries = unpublishedEntries;
  }
  return returnObj;
}

export default connect(mapStateToProps, {
  loadUnpublishedEntries,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  deleteUnpublishedEntry,
})(translate()(Workflow as any) as any);
