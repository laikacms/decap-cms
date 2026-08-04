import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
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
  scheduleUnpublishedEntryPublish,
  unscheduleUnpublishedEntryPublish,
  checkScheduledPublishes,
} from '../../actions/editorialWorkflow';
import { selectUnpublishedEntriesGroupedByStatus } from '../../reducers';
import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import WorkflowList from './WorkflowList';

const WorkflowContainer = styled.div`
  height: 100vh;
  margin: ${lengths.pageMarginMobile};
  @media (min-width: 500px) {
    margin: ${lengths.pageMargin};
  }
`;

const WorkflowTop = styled.div`
  ${components.cardTop};
`;

const WorkflowTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
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

class Workflow extends Component {
  static propTypes = {
    collections: PropTypes.object.isRequired,
    isEditorialWorkflow: PropTypes.bool.isRequired,
    isOpenAuthoring: PropTypes.bool,
    isFetching: PropTypes.bool,
    unpublishedEntries: ImmutablePropTypes.map,
    loadUnpublishedEntries: PropTypes.func.isRequired,
    updateUnpublishedEntryStatus: PropTypes.func.isRequired,
    publishUnpublishedEntry: PropTypes.func.isRequired,
    deleteUnpublishedEntry: PropTypes.func.isRequired,
    scheduleUnpublishedEntryPublish: PropTypes.func.isRequired,
    unscheduleUnpublishedEntryPublish: PropTypes.func.isRequired,
    checkScheduledPublishes: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  };

  // How often to check whether any "Ready" entry's scheduled publish time has
  // arrived. This only runs while the board is mounted in a browser tab; see the
  // doc comment on checkScheduledPublishes in actions/editorialWorkflow.ts.
  static SCHEDULED_PUBLISH_POLL_INTERVAL = 30000;

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(Workflow.propTypes, this.props, 'prop', 'Workflow');

    const { loadUnpublishedEntries, isEditorialWorkflow, collections, checkScheduledPublishes } =
      this.props;
    if (isEditorialWorkflow) {
      loadUnpublishedEntries(collections);
      checkScheduledPublishes();
      this.scheduledPublishInterval = setInterval(
        checkScheduledPublishes,
        Workflow.SCHEDULED_PUBLISH_POLL_INTERVAL,
      );
    }
  }

  componentWillUnmount() {
    if (this.scheduledPublishInterval) {
      clearInterval(this.scheduledPublishInterval);
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
      scheduleUnpublishedEntryPublish,
      unscheduleUnpublishedEntryPublish,
      collections,
      t,
    } = this.props;

    if (!isEditorialWorkflow) return null;
    if (isFetching) return <Loader active>{t('workflow.workflow.loading')}</Loader>;
    const reviewCount = unpublishedEntries.get('pending_review').size;
    const readyCount = unpublishedEntries.get('pending_publish').size;

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
                .filter(collection => collection.create)
                .map(collection => (
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
        <WorkflowList
          entries={unpublishedEntries}
          handleChangeStatus={updateUnpublishedEntryStatus}
          handlePublish={publishUnpublishedEntry}
          handleDelete={deleteUnpublishedEntry}
          handleSchedulePublish={scheduleUnpublishedEntryPublish}
          handleUnschedulePublish={unscheduleUnpublishedEntryPublish}
          isOpenAuthoring={isOpenAuthoring}
          collections={collections}
        />
      </WorkflowContainer>
    );
  }
}

function mapStateToProps(state) {
  const { collections, config, globalUI } = state;
  const isEditorialWorkflow = config.publish_mode === EDITORIAL_WORKFLOW;
  const isOpenAuthoring = globalUI.useOpenAuthoring;
  const returnObj = { collections, isEditorialWorkflow, isOpenAuthoring };

  if (isEditorialWorkflow) {
    returnObj.isFetching = state.editorialWorkflow.getIn(['pages', 'isFetching'], false);

    /*
     * Returns a memoized OrderedMap of status keys to entry sequences.
     * Eg.: OrderedMap{'draft':Seq(), 'pending_review':Seq(), 'pending_publish':Seq()}
     * The selector only recomputes when editorialWorkflow.entities changes,
     * preventing board rerenders on every unrelated app-wide dispatch.
     */
    returnObj.unpublishedEntries = selectUnpublishedEntriesGroupedByStatus(state);
  }
  return returnObj;
}

export default connect(mapStateToProps, {
  loadUnpublishedEntries,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  deleteUnpublishedEntry,
  scheduleUnpublishedEntryPublish,
  unscheduleUnpublishedEntryPublish,
  checkScheduledPublishes,
})(translate()(Workflow));
