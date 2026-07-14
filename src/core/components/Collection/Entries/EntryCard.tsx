import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useTranslate } from 'react-polyglot';

import { Link } from '@/core/routing/Link';
import { colors, colorsRaw, components, lengths, zIndex } from '@/ui/default/index';
import { boundGetAsset } from '@/core/actions/media';
import { VIEW_STYLE_LIST, VIEW_STYLE_GRID } from '@/core/constants/collectionViews';
import { selectEntryCollectionTitle } from '@/core/reducers/collections';
import { useAppDispatch } from '@/core/hooks/useRedux';

import type { CmsCollectionState, CmsEntry } from '@/lib/util/index';

const ListCard = styled.li`
  ${components.card};
  width: ${lengths.topCardWidth};
  margin-left: 12px;
  margin-bottom: 10px;
  overflow: hidden;
`;

const ListCardLink = styled(Link)`
  display: block;
  max-width: 100%;
  padding: 16px 20px;

  &:hover {
    background-color: ${colors.foreground};
  }
`;

const GridCard = styled.li`
  ${components.card};
  flex: 0 0 335px;
  height: 240px;
  overflow: hidden;
  margin-left: 12px;
  margin-bottom: 16px;
`;

const GridCardLink = styled(Link)`
  display: block;
  height: 100%;
  outline-offset: -2px;

  &,
  &:hover {
    background-color: ${colors.foreground};
    color: ${colors.text};
  }
`;

const CollectionLabel = styled.h2`
  font-size: 12px;
  color: ${colors.textLead};
  text-transform: uppercase;
`;

const ListCardTitle = styled.h2`
  margin-bottom: 0;
  display: flex;
  justify-content: space-between;
`;

const CardHeading = styled.h2`
  margin: 0 0 2px;
  display: flex;
  justify-content: space-between;
`;

const CardBody = styled.div<{ $hasImage?: boolean }>`
  padding: 16px 20px;
  height: 90px;
  position: relative;
  margin-bottom: ${props => props.$hasImage && 0};

  &:after {
    content: '';
    position: absolute;
    display: block;
    z-index: ${zIndex.zIndex1};
    bottom: 0;
    left: -20%;
    height: 140%;
    width: 140%;
    box-shadow: inset 0 -15px 24px ${colorsRaw.white};
  }
`;

const CardImage = styled.div<{ $src: string }>`
  background-image: url(${props => props.$src});
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  height: 150px;
`;

const TitleIcons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WorkflowBadge = styled.span<{ $status?: string }>`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  text-transform: uppercase;
  background-color: ${props => {
    switch (props.$status) {
      case 'draft':
        return colors.statusDraftBackground;
      case 'pending_review':
        return colors.statusReviewBackground;
      case 'pending_publish':
        return colors.statusReadyBackground;
      default:
        return colors.background;
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'draft':
        return colors.statusDraftText;
      case 'pending_review':
        return colors.statusReviewText;
      case 'pending_publish':
        return colors.statusReadyText;
      default:
        return colors.text;
    }
  }};
`;

interface EntryCardProps {
  collection: CmsCollectionState;
  entry: CmsEntry;
  inferredFields: {
    imageField?: string | null;
    [key: string]: unknown;
  };
  collectionLabel?: string | false;
  viewStyle?: string;
  workflowStatus?: string | null;
}

export default function EntryCard({
  collection,
  entry,
  inferredFields,
  collectionLabel,
  viewStyle = VIEW_STYLE_LIST,
  workflowStatus,
}: EntryCardProps) {
  const t = useTranslate();
  const dispatch = useAppDispatch();
  const getAsset = React.useMemo(
    () => boundGetAsset(dispatch, collection, entry),
    [dispatch, collection, entry],
  );

  const summary = selectEntryCollectionTitle(collection, entry);
  const path = `/collections/${collection.name}/entries/${entry.slug}`;
  const entryData = entry.data as Record<string, unknown> | undefined;
  const imageField = inferredFields.imageField ?? '';
  let image = imageField ? (entryData?.[imageField] as string | undefined) : undefined;
  if (image) image = encodeURI(image);

  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!image || !imageField) {
      setResolvedImageUrl(undefined);
      return;
    }
    const asset = getAsset(image, imageField as any);
    setResolvedImageUrl(asset.toString());
  }, [getAsset, image, imageField]);

  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending_review':
        return t('editor.editorToolbar.inReview');
      case 'pending_publish':
        return t('editor.editorToolbar.ready');
      case 'draft':
        return t('editor.editorToolbar.draft');
      default:
        return status;
    }
  }

  if (viewStyle === VIEW_STYLE_LIST) {
    return (
      <ListCard>
        <ListCardLink className="ListCardLink" to={path}>
          {collectionLabel ? <CollectionLabel>{collectionLabel}</CollectionLabel> : null}
          <ListCardTitle>
            {summary}
            <TitleIcons>
              {workflowStatus && (
                <WorkflowBadge $status={workflowStatus}>
                  {getStatusLabel(workflowStatus)}
                </WorkflowBadge>
              )}
            </TitleIcons>
          </ListCardTitle>
        </ListCardLink>
      </ListCard>
    );
  }

  if (viewStyle === VIEW_STYLE_GRID) {
    return (
      <GridCard>
        <GridCardLink to={path}>
          <CardBody $hasImage={!!image}>
            {collectionLabel ? <CollectionLabel>{collectionLabel}</CollectionLabel> : null}
            <CardHeading>
              {summary}
              <TitleIcons>
                {workflowStatus && (
                  <WorkflowBadge $status={workflowStatus}>
                    {getStatusLabel(workflowStatus)}
                  </WorkflowBadge>
                )}
              </TitleIcons>
            </CardHeading>
          </CardBody>
          {resolvedImageUrl ? (
            <CardImage className="CardImage" $src={resolvedImageUrl} />
          ) : null}
        </GridCardLink>
      </GridCard>
    );
  }
  return null;
}
