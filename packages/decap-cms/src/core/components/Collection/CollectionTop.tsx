import styled from '@emotion/styled';
import React from 'react';

import { translate } from '@/core/i18n';
import { Link } from '@/core/routing/Link';
import { buttons, components, shadows } from '@/ui/default/index';

import type { CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const CollectionTopContainer = styled.div`
  ${components.cardTop};
  margin-bottom: 22px;
`;

const CollectionTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 500px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CollectionTopHeading = styled.h1`
  ${components.cardTopHeading};
`;

const CollectionTopNewButton = styled(Link)`
  ${buttons.button};
  ${shadows.dropDeep};
  ${buttons.default};
  ${buttons.gray};

  padding: 0 30px;

  @media (max-width: 500px) {
    margin-top: 12px;
    text-align: center;
  }
`;

const CollectionTopDescription = styled.p`
  ${components.cardTopDescription};
  margin-bottom: 0;
`;

function getCollectionProps(collection: CmsCollectionState) {
  const collectionLabel = collection.label;
  const collectionLabelSingular = collection.label_singular;
  const collectionDescription = collection.description;

  return {
    collectionLabel,
    collectionLabelSingular,
    collectionDescription,
  };
}

interface CollectionTopProps {
  collection: CmsCollectionState;
  newEntryUrl?: string;
  t: TranslateFunction;
}

function CollectionTop({ collection, newEntryUrl, t }: CollectionTopProps) {
  const { collectionLabel, collectionLabelSingular, collectionDescription } = getCollectionProps(collection);

  return (
    <CollectionTopContainer>
      <CollectionTopRow>
        <CollectionTopHeading>{collectionLabel}</CollectionTopHeading>
        {newEntryUrl
          ? (
            <CollectionTopNewButton
              to={newEntryUrl}
              dir="auto"
              aria-label={t('collection.collectionTop.newButtonAriaLabel', {
                collectionLabel: collectionLabelSingular || collectionLabel,
              })}
            >
              {t('collection.collectionTop.newButton', {
                collectionLabel: collectionLabelSingular || collectionLabel,
              })}
            </CollectionTopNewButton>
          )
          : null}
      </CollectionTopRow>
      {collectionDescription
        ? (
          <CollectionTopDescription>
            {collectionDescription as React.ReactNode}
          </CollectionTopDescription>
        )
        : null}
    </CollectionTopContainer>
  );
}

export default translate()(CollectionTop);
