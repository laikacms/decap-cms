import styled from '@emotion/styled';
import React from 'react';
import { Link } from 'react-router-dom';

import { translate } from '@/core/i18n';
import { colors } from '@/ui/default/index';
import { LaikaButton } from './ui';

import type { CollectionTopRenderProps } from '@/app/components/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled collection header. Replaces core's `CollectionTop` via the
 * `renderCollectionTop` slot.
 *
 * Breadcrumb (Dashboard → Collection) + large heading + description + the
 * primary "New X" button driven by `LaikaButton`. Visually consistent with
 * the dashboard cards above it.
 */

const Container = styled.div`
  margin-bottom: 24px;
`;

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: ${colors.controlLabel};

  a {
    color: ${colors.controlLabel};
    text-decoration: none;

    &:hover,
    &:focus-visible {
      color: ${colors.active};
    }
  }
`;

const Crumb = styled(Link)`
  font-weight: 500;
`;

const Separator = styled.span`
  opacity: 0.5;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const TitleBlock = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Description = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${colors.controlLabel};
  line-height: 1.5;
`;

interface LaikaCollectionTopProps extends CollectionTopRenderProps {
  t: TranslateFunction;
}

function LaikaCollectionTop({ collection, newEntryUrl, filterTerm, t }: LaikaCollectionTopProps) {
  const labelSingular = collection.label_singular || collection.label;
  const description = collection.description as React.ReactNode | undefined;

  // Inside a nested collection the sidebar tree filters by folder path
  // (/collections/<name>/filter/<path>); mirror that path here so every
  // ancestor folder is one crumb up the tree, with the current folder last.
  const pathSegments = filterTerm ? filterTerm.split('/').filter(Boolean) : [];
  const currentFolder = pathSegments[pathSegments.length - 1];

  return (
    <Container>
      <Breadcrumb aria-label="Breadcrumb">
        <Crumb to="/">Dashboard</Crumb>
        <Separator>/</Separator>
        {pathSegments.length === 0 ? <span>{collection.label}</span> : (
          <>
            <Crumb to={`/collections/${collection.name}`}>{collection.label}</Crumb>
            {pathSegments.slice(0, -1).map((segment, i) => {
              const ancestorPath = pathSegments.slice(0, i + 1).join('/');
              return (
                <React.Fragment key={ancestorPath}>
                  <Separator>/</Separator>
                  <Crumb to={`/collections/${collection.name}/filter/${ancestorPath}`}>{segment}</Crumb>
                </React.Fragment>
              );
            })}
            <Separator>/</Separator>
            <span>{currentFolder}</span>
          </>
        )}
      </Breadcrumb>
      <Row>
        <TitleBlock>
          <Heading>{collection.label}</Heading>
          {description ? <Description>{description}</Description> : null}
        </TitleBlock>
        {newEntryUrl
          ? (
            <LaikaButton to={newEntryUrl} dir="auto">
              {t('collection.collectionTop.newButton', { collectionLabel: labelSingular })}
            </LaikaButton>
          )
          : null}
      </Row>
    </Container>
  );
}

export default translate()(LaikaCollectionTop);
