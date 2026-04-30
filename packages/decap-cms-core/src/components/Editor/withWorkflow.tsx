import React from 'react';
import { connect } from 'react-redux';

import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import { selectUnpublishedEntry } from '../../reducers';
import { selectAllowDeletion } from '../../reducers/collections';
import { loadUnpublishedEntry, persistUnpublishedEntry } from '../../actions/editorialWorkflow';

import type { CmsCollectionState } from 'decap-cms-lib-util';

type Collection = CmsCollectionState;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type State = any;

interface OwnProps {
  match: {
    params: {
      name: string;
      [key: number]: string;
    };
  };
  newEntry?: boolean;
}

interface StateProps {
  isEditorialWorkflow: boolean;
  showDelete: boolean | undefined;
  unpublishedEntry?: boolean;
  entry?: any;
}

interface MergedProps {
  loadEntry?: (collection: Collection, slug: string) => void;
  persistEntry?: (collection: Collection) => void;
}

function mapStateToProps(state: State, ownProps: OwnProps): StateProps {
  const { collections } = state;
  const isEditorialWorkflow = state.config.publish_mode === EDITORIAL_WORKFLOW;
  const collection = collections[ownProps.match.params.name];
  const returnObj: StateProps = {
    isEditorialWorkflow,
    showDelete: !ownProps.newEntry && selectAllowDeletion(collection as Collection),
  };
  if (isEditorialWorkflow) {
    const slug = ownProps.match.params[0];
    const unpublishedEntry = selectUnpublishedEntry(state, (collection as Collection).name, slug);
    if (unpublishedEntry) {
      returnObj.unpublishedEntry = true;
      returnObj.entry = unpublishedEntry;
    }
  }
  return returnObj;
}

function mergeProps(
  stateProps: StateProps,
  dispatchProps: { dispatch: Function },
  ownProps: OwnProps,
): OwnProps & StateProps & MergedProps {
  const { isEditorialWorkflow, unpublishedEntry } = stateProps;
  const { dispatch } = dispatchProps;
  const returnObj: MergedProps = {};

  if (isEditorialWorkflow) {
    // Overwrite loadEntry to loadUnpublishedEntry
    returnObj.loadEntry = (collection: Collection, slug: string) =>
      dispatch(loadUnpublishedEntry(collection, slug));

    // Overwrite persistEntry to persistUnpublishedEntry
    returnObj.persistEntry = (collection: Collection) =>
      dispatch(persistUnpublishedEntry(collection, !!unpublishedEntry));
  }

  return {
    ...ownProps,
    ...stateProps,
    ...returnObj,
  };
}

export default function withWorkflow(Editor: React.ComponentType<any>) {
  return connect(
    mapStateToProps,
    null,
    mergeProps,
  )(
    class WorkflowEditor extends React.Component<any> {
      render() {
        return <Editor {...this.props} />;
      }
    },
  );
}
