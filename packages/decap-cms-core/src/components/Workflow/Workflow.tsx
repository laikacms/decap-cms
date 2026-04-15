import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { OrderedMap } from 'immutable';
import type { Map as ImmutableMap } from 'immutable';
import type { TranslateFunction } from 'decap-cms-ui-default';
import type { Collections, State, Collection } from '../../types/cms';
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
  unpublishedEntries?: ImmutableMap<string, any>;
  loadUnpublishedEntries: (collections: Collections) => void;
  updateUnpublishedEntryStatus: (collection: string, slug: string, oldStatus: string, newStatus: string) => void;
  publishUnpublishedEntry: (collection: string, slug: string) => void;
  deleteUnpublishedEntry: (collection: string, slug: string) => void;
  t: TranslateFunction;
}

class Workflow extends Component<WorkflowProps> {
  static propTypes = {
    collections: ImmutablePropTypes.map.isRequired,
    isEditorialWorkflow: PropTypes.bool.isRequired,
    isOpenAuthoring: PropTypes.bool,
    isFetching: PropTypes.bool,
    unpublishedEntries: ImmutablePropTypes.map,
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
    const reviewCount = unpublishedEntries ? unpublishedEntries.get('pending_review')?.size ?? 0 : 0;
    const readyCount = unpublishedEntries ? unpublishedEntries.get('pending_publish')?.size ?? 0 : 0;

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
              {collections
                .filter((collection: Collection) => !!collection.get('create'))
                .valueSeq()
                .map((collection: Collection) => (
                  <DropdownItem
                    key={collection.get('name')}
                    label={collection.get('label')}
                    onClick={() => createNewEntry(collection.get('name'))}
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
    unpublishedEntries?: ImmutableMap<string, any>;
  } = { collections, isEditorialWorkflow, isOpenAuthoring };

  if (isEditorialWorkflow) {
    returnObj.isFetching = (state.editorialWorkflow as any).getIn(['pages', 'isFetching'], false);

    /*
     * Generates an ordered Map of the available status as keys.
     * Each key containing a Sequence of available unpubhlished entries
     * Eg.: OrderedMap{'draft':Seq(), 'pending_review':Seq(), 'pending_publish':Seq()}
     */
    returnObj.unpublishedEntries = status.reduce((acc, currStatus) => {
      const entries = selectUnpublishedEntriesByStatus(state, currStatus as Status);
      return acc.set(currStatus as string, entries);
    }, OrderedMap<string, any>());
  }
  return returnObj;
}

export default connect(mapStateToProps, {
  loadUnpublishedEntries,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  deleteUnpublishedEntry,
})(translate()(Workflow as any) as any);
