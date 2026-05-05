import React from 'react';

import { EDITORIAL_WORKFLOW } from '../../constants/publishModes';
import { selectUnpublishedEntry } from '../../reducers';
import { selectAllowDeletion } from '../../reducers/collections';
import { loadUnpublishedEntry, persistUnpublishedEntry } from '../../actions/editorialWorkflow';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';

import type { CmsCollectionState } from 'decap-cms-lib-util';

interface OwnProps {
  match: {
    params: {
      name: string;
      [key: number]: string;
    };
  };
  newEntry?: boolean;
}

export default function withWorkflow(Editor: React.ComponentType<any>) {
  return function WorkflowEditor(props: OwnProps) {
    const dispatch = useAppDispatch();
    const { match, newEntry } = props;

    const isEditorialWorkflow = useAppSelector(
      (state: any) => state.config.publish_mode === EDITORIAL_WORKFLOW,
    );
    const collection = useAppSelector((state: any) => state.collections[match.params.name]);
    const unpublishedEntry = useAppSelector((state: any) =>
      isEditorialWorkflow && collection
        ? selectUnpublishedEntry(state, (collection as CmsCollectionState).name, match.params[0])
        : undefined,
    );

    const showDelete = !newEntry && selectAllowDeletion(collection as CmsCollectionState);

    const extraProps: {
      loadEntry?: (collection: CmsCollectionState, slug: string) => void;
      persistEntry?: (collection: CmsCollectionState) => void;
      unpublishedEntry?: boolean;
      entry?: unknown;
    } = {};

    if (isEditorialWorkflow) {
      extraProps.loadEntry = (collection: CmsCollectionState, slug: string) =>
        dispatch(loadUnpublishedEntry(collection, slug));
      extraProps.persistEntry = (collection: CmsCollectionState) =>
        dispatch(persistUnpublishedEntry(collection, !!unpublishedEntry));

      if (unpublishedEntry) {
        extraProps.unpublishedEntry = true;
        extraProps.entry = unpublishedEntry;
      }
    }

    return (
      <Editor
        {...props}
        isEditorialWorkflow={isEditorialWorkflow}
        showDelete={showDelete}
        {...extraProps}
      />
    );
  };
}
