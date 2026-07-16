import React from 'react';

import { loadUnpublishedEntry, persistUnpublishedEntry } from '@/core/actions/editorialWorkflow';
import { EDITORIAL_WORKFLOW } from '@/core/constants/publishModes';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { selectUnpublishedEntry } from '@/core/reducers';
import { selectAllowDeletion } from '@/core/reducers/collections';

import type { CmsCollectionState } from '@/lib/util/index';

type Collection = CmsCollectionState;

interface OwnProps {
  match: {
    params: {
      name: string,
      [key: number]: string,
    },
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
        ? selectUnpublishedEntry(state, (collection as Collection).name, match.params[0])
        : undefined
    );

    const showDelete = !newEntry && selectAllowDeletion(collection as Collection);

    const extraProps: {
      loadEntry?: (collection: Collection, slug: string) => void,
      persistEntry?: (collection: Collection) => void,
      unpublishedEntry?: boolean,
      entry?: unknown,
    } = {};

    if (isEditorialWorkflow) {
      extraProps.loadEntry = (collection: Collection, slug: string) => dispatch(loadUnpublishedEntry(collection, slug));
      extraProps.persistEntry = (collection: Collection) =>
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
