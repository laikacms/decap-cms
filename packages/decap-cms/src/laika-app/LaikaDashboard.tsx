/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';
import React from 'react';

import { createNewEntry } from '@/core/actions/collections';
import { useAppSelector } from '@/core/hooks/useRedux';
import { translate } from '@/core/i18n';
import { colors, Icon, lengths } from '@/ui/default/index';
import { LaikaBadge, LaikaButton, LaikaCard } from './ui';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Home page rendered at `/` when laika-app's `renderRoot` slot is mounted.
 * Welcome card + responsive grid of collection cards, each with a "Browse"
 * link and an optional "Quick add" button. Mounted inside the Decap router,
 * so `LaikaButton`'s `to` prop hooks into the same history.
 *
 * Built on top of LaikaCard/LaikaButton/LaikaBadge from `./ui/`, so visual
 * consistency cascades whenever those primitives change.
 */

const Page = styled.div`
  padding: 32px 8px;
`;

const Welcome = styled.section`
  margin-bottom: 32px;
`;

const Greeting = styled.h1`
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Subtle = styled.p`
  margin: 0;
  color: ${colors.controlLabel};
  font-size: 15px;
`;

const SectionHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${colors.controlLabel};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
`;

const CardIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background-color: ${colors.activeBackground};
  color: ${colors.active};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  border-radius: ${lengths.borderRadius};
  border: 1px dashed ${colors.textFieldBorder};
  color: ${colors.controlLabel};
`;

function collectionIcon(collection: CmsCollectionState) {
  return collection.type === 'file_based_collection' ? 'page' : 'write';
}

interface LaikaDashboardProps {
  t: TranslateFunction;
}

function LaikaDashboard({ t }: LaikaDashboardProps) {
  const collections = useAppSelector(state => state.collections) as CmsCollections | undefined;
  const user = useAppSelector(state => state.auth?.user) as { name?: string } | undefined;
  const config = useAppSelector(state => state.config);

  const visibleCollections = React.useMemo<CmsCollectionState[]>(
    () => Object.values((collections ?? {}) as CmsCollections).filter(c => c.hide !== true),
    [collections],
  );

  const greeting = user?.name ? `Welcome back, ${user.name}` : 'Welcome';
  const siteName = (config as { site_name?: string, name?: string } | null | undefined)?.site_name
    ?? (config as { site_name?: string, name?: string } | null | undefined)?.name;

  return (
    <Page>
      <Welcome>
        <Greeting>{greeting}</Greeting>
        <Subtle>
          {siteName ? `Manage content for ${siteName}.` : 'Pick a collection to start editing.'}
        </Subtle>
      </Welcome>
      <SectionHeading>
        {t('collection.sidebar.collections')}
        <LaikaBadge>{visibleCollections.length}</LaikaBadge>
      </SectionHeading>
      {visibleCollections.length === 0 ? <EmptyState>No collections are configured yet.</EmptyState> : (
        <Grid>
          {visibleCollections.map(collection => (
            <LaikaCard key={collection.name}>
              <LaikaCard.Header>
                <CardIcon>
                  <Icon type={collectionIcon(collection)} />
                </CardIcon>
                <LaikaCard.Title>{collection.label}</LaikaCard.Title>
                {Array.isArray(collection.files) && collection.files.length > 0
                  ? <LaikaBadge intent="info">{collection.files.length}</LaikaBadge>
                  : null}
              </LaikaCard.Header>
              <LaikaCard.Body>
                {collection.description
                  ? collection.description
                  : collection.type === 'file_based_collection'
                  ? 'Single-file collection.'
                  : 'Folder-based collection.'}
              </LaikaCard.Body>
              <LaikaCard.Footer>
                <LaikaButton variant="secondary" to={`/collections/${collection.name}`} fullWidth>
                  Browse
                </LaikaButton>
                {collection.create
                  ? (
                    <LaikaButton onClick={() => createNewEntry(collection.name)}>
                      {t('app.header.quickAdd')}
                    </LaikaButton>
                  )
                  : null}
              </LaikaCard.Footer>
            </LaikaCard>
          ))}
        </Grid>
      )}
    </Page>
  );
}

export default translate()(LaikaDashboard);
