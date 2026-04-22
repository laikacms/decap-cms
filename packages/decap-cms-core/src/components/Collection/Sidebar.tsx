import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { translate } from 'react-polyglot';
import { NavLink } from 'react-router-dom';
import type { TranslateFunction } from 'decap-cms-ui-default';
import { Icon, components, colors } from 'decap-cms-ui-default';

import type { CmsCollectionObject, CmsCollections } from 'decap-cms-lib-util/types/cms';

type Collection = CmsCollectionObject;
type Collections = CmsCollections;

import { searchCollections } from '../../actions/collections';
import CollectionSearch from './CollectionSearch';
import NestedCollection from './NestedCollection';

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

  ${Icon} {
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
  collections: Collections;
  collection?: Collection;
  isSearchEnabled?: boolean;
  searchTerm?: string;
  filterTerm?: string;
  t: TranslateFunction;
}

export class Sidebar extends React.Component<SidebarProps> {
  renderLink = (collection: Collection, filterTerm: string | undefined) => {
    const collectionName = collection.name;
    if (collection.nested) {
      return (
        <li key={collectionName}>
          <NestedCollection
            collection={collection}
            filterTerm={filterTerm as string}
            data-testid={collectionName}
            entries={undefined as any}
          />
        </li>
      );
    }
    return (
      <li key={collectionName}>
        <SidebarNavLink
          to={`/collections/${collectionName}`}
          className={({ isActive }: { isActive: boolean }) => isActive ? 'active' : ''}
          data-testid={collectionName}
        >
          <Icon type="write" />
          {collection.label}
        </SidebarNavLink>
      </li>
    );
  };

  render() {
    const { collections, collection, isSearchEnabled, searchTerm, t, filterTerm } = this.props;
    return (
      <SidebarContainer>
        <SidebarHeading>{t('collection.sidebar.collections')}</SidebarHeading>
        {isSearchEnabled && (
          <CollectionSearch
            searchTerm={searchTerm || ''}
            collections={collections}
            collection={collection}
            onSubmit={(query: string, collection?: string) => searchCollections(query, collection as string)}
          />
        )}
        <SidebarNavList>
          {Object.values(collections)
            .filter((collection: Collection) => collection.hide !== true)
            .map((collection: Collection) => this.renderLink(collection, filterTerm))}
        </SidebarNavList>
      </SidebarContainer>
    );
  }
}

export default translate()(Sidebar);
