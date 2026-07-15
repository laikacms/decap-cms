/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';

import { useTranslate } from '@/core/i18n';
import { colors, lengths } from '@/ui/default/index';
import { boundGetAsset } from '@/core/actions/media';
import { selectEntryCollectionTitle } from '@/core/reducers/collections';
import { useAppDispatch } from '@/core/hooks/useRedux';
import { LaikaBadge } from './ui';
import { laikaShouldForwardProp } from '@/ui/styled';

import type { LaikaBadgeIntent } from './ui';
import type { EntryCardRenderProps } from '@/app/components/index';

/**
 * Laika-styled entry card. Renders inside core's `EntryListing` via the
 * `renderEntryCard` slot. Two view styles — list and grid — built on top of
 * `LaikaCard` tokens but laid out specifically for one-or-many entries on a
 * dense page.
 */

const VIEW_STYLE_LIST = 'VIEW_STYLE_LIST';
const VIEW_STYLE_GRID = 'VIEW_STYLE_GRID';

const ListCard = styled.li`
  /* Core's CardsGrid is a wrapping flex row (with margin-left: -12px);
     claim the full row or list cards shrink-wrap side by side like grid
     blocks. */
  flex: 0 0 calc(100% - 12px);
  max-width: calc(100% - 12px);
  list-style: none;
  margin: 0 0 8px 12px;
`;

const ListCardLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.foreground};
  color: ${colors.textLead};
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: ${colors.active};
    box-shadow: var(--laika-shadow-soft, 0 6px 18px rgba(15, 23, 42, 0.06));
    outline: none;
  }
`;

const ListTitle = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const ListCollectionLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.controlLabel};
`;

const GridCard = styled.li`
  display: block;
  list-style: none;
  margin: 0;
`;

const GridCardLink = styled(Link)`
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.foreground};
  color: ${colors.textLead};
  text-decoration: none;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: ${colors.active};
    box-shadow: var(--laika-shadow-soft, 0 6px 18px rgba(15, 23, 42, 0.06));
    outline: none;
  }
`;

const GridImage = styled('div', { shouldForwardProp: laikaShouldForwardProp })<{
  $src: string;
}>`
  background-image: url(${({ $src }) => $src});
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  height: 150px;
`;

const GridBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  flex: 1 1 auto;
`;

const GridTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${colors.textLead};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const GridFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
`;

const GRID_CONTAINER_OVERRIDE = styled.div`
  flex: 0 0 calc(33.333% - 12px);
  max-width: calc(33.333% - 12px);
  margin: 0 12px 16px 0;
`;

function workflowIntent(status?: string | null): LaikaBadgeIntent {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'pending_review':
      return 'warning';
    case 'pending_publish':
      return 'success';
    default:
      return 'neutral';
  }
}

function LaikaEntryCard({
  collection,
  entry,
  inferredFields,
  collectionLabel,
  viewStyle = VIEW_STYLE_LIST,
  workflowStatus,
}: EntryCardRenderProps) {
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

  const [resolvedImageUrl, setResolvedImageUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!image || !imageField) {
      setResolvedImageUrl(undefined);
      return;
    }
    const asset = getAsset(image, imageField as any);
    setResolvedImageUrl(asset.toString());
  }, [getAsset, image, imageField]);

  function statusLabel(status: string) {
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

  if (viewStyle === VIEW_STYLE_GRID) {
    return (
      <GRID_CONTAINER_OVERRIDE>
        <GridCard>
          <GridCardLink to={path}>
            {resolvedImageUrl ? <GridImage $src={resolvedImageUrl} /> : null}
            <GridBody>
              {collectionLabel ? (
                <ListCollectionLabel>{collectionLabel}</ListCollectionLabel>
              ) : null}
              <GridTitle>{summary}</GridTitle>
              {workflowStatus ? (
                <GridFooter>
                  <LaikaBadge intent={workflowIntent(workflowStatus)}>
                    {statusLabel(workflowStatus)}
                  </LaikaBadge>
                </GridFooter>
              ) : null}
            </GridBody>
          </GridCardLink>
        </GridCard>
      </GRID_CONTAINER_OVERRIDE>
    );
  }

  return (
    <ListCard>
      <ListCardLink to={path}>
        <ListTitle>{summary}</ListTitle>
        <ListMeta>
          {collectionLabel ? <ListCollectionLabel>{collectionLabel}</ListCollectionLabel> : null}
          {workflowStatus ? (
            <LaikaBadge intent={workflowIntent(workflowStatus)}>
              {statusLabel(workflowStatus)}
            </LaikaBadge>
          ) : null}
        </ListMeta>
      </ListCardLink>
    </ListCard>
  );
}

export default LaikaEntryCard;
