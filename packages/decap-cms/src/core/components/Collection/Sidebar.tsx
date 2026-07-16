import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { searchCollections } from '@/core/actions/collections';
import { translate } from '@/core/i18n';
import { NavLink } from '@/core/routing/Link';
import { colors, components, Icon } from '@/ui/default/index';
import CollectionSearch from './CollectionSearch';
import NestedCollection from './NestedCollection';

import type { CmsCollections, CmsCollectionState } from '@/lib/util/index';
import type { TranslateFunction } from '@/ui/default/index';

const styles = {
  sidebarNavLinkActive: css`
    color: ${colors.active};
    background-color: ${colors.activeBackground};
    border-left-color: #4863c6;
  `,
};

const SidebarContainer = styled.aside`
  ${components.card};
  width: 250px;
  padding: 8px 0 12px;
  position: fixed;
  max-height: calc(100vh - 112px);
  display: flex;
  flex-direction: column;
`;

const SidebarHeading = styled.h2`
  font-size: 22px;
  font-weight: 600;
  line-height: 37px;
  padding: 0;
  margin: 10px 20px;
  color: ${colors.textLead};
`;

const SidebarNavList = styled.ul`
  margin: 12px 0 0;
  list-style: none;
  overflow: auto;
`;

const SidebarNavLink = styled(NavLink)`
  display: flex;
  font-size: 14px;
  font-weight: 500;
  align-items: center;
  padding: 8px 18px;
  border-left: 2px solid #fff;
  z-index: -1;

  .decap-icon {
    margin-right: 4px;
    flex-shrink: 0;
  }

  &:hover,
  &:active,
  &.active {
    ${styles.sidebarNavLinkActive};
  }
`;

interface SidebarProps {
  collections: CmsCollections;
  collection?: CmsCollectionState;
  isSearchEnabled?: boolean;
  searchTerm?: string;
  filterTerm?: string;
  t: TranslateFunction;
}

function renderLink(collection: CmsCollectionState, filterTerm: string | undefined) {
  const collectionName = collection.name;
  if (collection.nested) {
    return (
      <li key={collectionName}>
        <NestedCollection
          collection={collection}
          filterTerm={filterTerm as string}
          data-testid={collectionName}
        />
      </li>
    );
  }
  return (
    <li key={collectionName}>
      <SidebarNavLink to={`/collections/${collectionName}`} data-testid={collectionName}>
        <Icon type="write" />
        {collection.label}
      </SidebarNavLink>
    </li>
  );
}

export function Sidebar({
  collections,
  collection,
  isSearchEnabled,
  searchTerm,
  t,
  filterTerm,
}: SidebarProps) {
  return (
    <SidebarContainer>
      <SidebarHeading>{t('collection.sidebar.collections')}</SidebarHeading>
      {isSearchEnabled && (
        <CollectionSearch
          searchTerm={searchTerm || ''}
          collections={collections}
          collection={collection}
          onSubmit={(query: string, c?: string) => searchCollections(query, c as string)}
        />
      )}
      <SidebarNavList className="SidebarNavList">
        {Object.values(collections)
          .filter((c: CmsCollectionState) => c.hide !== true)
          .map((c: CmsCollectionState) => renderLink(c, filterTerm))}
      </SidebarNavList>
    </SidebarContainer>
  );
}

export default translate()(Sidebar);
