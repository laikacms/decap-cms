import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';

import {
  Dropdown,
  DropdownItem,
  StyledDropdownButton,
  Loader,
  lengths,
  components,
  shadows,
} from '@/ui/default/index';
import { createNewEntry } from '@/core/actions/collections';
import {
  loadUnpublishedEntries,
  updateUnpublishedEntryStatus,
  publishUnpublishedEntry,
  deleteUnpublishedEntry,
} from '@/core/actions/editorialWorkflow';
import { selectUnpublishedEntriesGroupedByStatus } from '@/core/reducers';
import { EDITORIAL_WORKFLOW } from '@/core/constants/publishModes';
import WorkflowList from './WorkflowList';
import { useAppDispatch, useAppSelector } from '@/core/hooks/useRedux';
import { useCmsSlots } from '@/core/lib/slots';

import type { Status } from '@/core/constants/publishModes';
import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

type Collections = CmsCollections;
type Collection = CmsCollectionState;

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
  t: TranslateFunction;
}

function Workflow({ t }: WorkflowProps) {
  const { renderLoader } = useCmsSlots();
  const dispatch = useAppDispatch();
  const collections = useAppSelector((state: any) => state.collections as Collections);
  const isEditorialWorkflow = useAppSelector(
    (state: any) => state.config.publish_mode === EDITORIAL_WORKFLOW,
  );
  const isOpenAuthoring = useAppSelector((state: any) => state.globalUI.useOpenAuthoring);
  const isFetching = useAppSelector((state: any) =>
    isEditorialWorkflow ? (state.editorialWorkflow?.pages?.isFetching ?? false) : false,
  );
  const unpublishedEntries = useAppSelector((state: any) =>
    isEditorialWorkflow ? selectUnpublishedEntriesGroupedByStatus(state) : undefined,
  );

  React.useEffect(() => {
    if (isEditorialWorkflow) {
      dispatch(loadUnpublishedEntries(collections));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match prior componentDidMount semantics
  }, []);

  if (!isEditorialWorkflow) return null;
  if (isFetching) {
    return renderLoader ? (
      <>{renderLoader({ label: t('workflow.workflow.loading'), context: 'workflow' })}</>
    ) : (
      <Loader active>{t('workflow.workflow.loading')}</Loader>
    );
  }
  const reviewCount = unpublishedEntries ? (unpublishedEntries['pending_review']?.length ?? 0) : 0;
  const readyCount = unpublishedEntries ? (unpublishedEntries['pending_publish']?.length ?? 0) : 0;

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
        handleChangeStatus: (
          collection: string,
          slug: string,
          oldStatus: Status,
          newStatus: Status,
        ) => dispatch(updateUnpublishedEntryStatus(collection, slug, oldStatus, newStatus)),
        handlePublish: (collection: string, slug: string) =>
          dispatch(publishUnpublishedEntry(collection, slug)),
        handleDelete: (collection: string, slug: string) =>
          dispatch(deleteUnpublishedEntry(collection, slug)),
        isOpenAuthoring,
        collections,
      })}
    </WorkflowContainer>
  );
}

export default translate()(Workflow as any) as any;
