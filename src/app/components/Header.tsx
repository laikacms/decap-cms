/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { translate } from 'react-polyglot';

import { NavLink } from '../../core/routing/Link';
import { useLocation } from '../../core/routing/context';
import {
  Icon,
  Dropdown,
  DropdownItem,
  StyledDropdownButton,
  colors,
  lengths,
  shadows,
  buttons,
  zIndex,
} from '../../ui/default/index';
import { SettingsDropdown } from '../../core/components/UI';
import { checkBackendStatus } from '../../core/actions/status';
import { useAppDispatch } from '../../core/hooks/useRedux';

import type { TranslateFunction } from '../../ui/default/index';
import type { CmsCollectionState, CmsCollections } from '../../lib/util/index';

type Collection = CmsCollectionState;
type Collections = CmsCollections;

const ACTIVE_CLASS_NAME = 'header-link-active';

const styles = {
  buttonActive: css`
    color: ${colors.active};
  `,
};

function AppHeader(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <header
      css={css`
        ${shadows.dropMain};
        position: sticky;
        width: 100%;
        top: 0;
        background-color: ${colors.foreground};
        z-index: ${zIndex.zIndex300};
        height: ${lengths.topBarHeight};
      `}
      {...props}
    />
  );
}

const AppHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  min-width: 800px;
  max-width: 1440px;
  padding: 0 12px;
  margin: 0 auto;
`;

const AppHeaderButton = styled.button`
  ${buttons.button};
  background: none;
  color: #7b8290;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  display: inline-flex;
  padding: 16px 20px;
  align-items: center;

  ${Icon} {
    margin-right: 4px;
    color: #b3b9c4;
  }

  &:hover,
  &:active,
  &:focus-visible {
    ${styles.buttonActive};

    ${Icon} {
      ${styles.buttonActive};
    }
  }

  &.${ACTIVE_CLASS_NAME} {
    ${styles.buttonActive};

    ${Icon} {
      ${styles.buttonActive};
    }
  }
`;

const AppHeaderNavLink = AppHeaderButton.withComponent(NavLink);

const AppHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
`;

const AppHeaderQuickNewButton = styled(StyledDropdownButton)`
  ${buttons.button};
  ${buttons.medium};
  ${buttons.gray};
  margin-right: 8px;

  &:after {
    top: 11px;
  }
`;

const AppHeaderNavList = styled.ul`
  display: flex;
  margin: 0;
  list-style: none;
`;

const AppHeaderLogo = styled.li`
  display: flex;
  align-items: center;

  img {
    padding: 12px 20px;
    max-height: 56px;
    max-width: 300px;
    object-fit: contain;
    object-position: center;
  }
`;

interface HeaderProps {
  user: { avatar_url?: string; [key: string]: unknown };
  collections: Collections;
  onCreateEntryClick: (collectionName: string) => void;
  onLogoutClick: () => void;
  openMediaLibrary: () => void;
  hasWorkflow: boolean;
  displayUrl?: string;
  showMediaButton?: boolean;
  logoUrl?: string;
  logo?: { src: string; show_in_header?: boolean };
  isTestRepo?: boolean;
  t: TranslateFunction;
}

function Header({
  user,
  collections,
  onCreateEntryClick,
  onLogoutClick,
  openMediaLibrary,
  hasWorkflow,
  displayUrl,
  showMediaButton,
  logoUrl, // Deprecated, replaced by `logo.src`
  logo,
  isTestRepo,
  t,
}: HeaderProps) {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  // A function `className` passed to a `styled(NavLink)` is stringified by
  // emotion before NavLink can call it, so the active class was never applied.
  // Derive the active state from the current route instead.
  const contentActive = pathname === '/' || pathname.startsWith('/collections');
  const workflowActive = pathname.startsWith('/workflow');

  React.useEffect(() => {
    const intervalId = setInterval(
      () => {
        dispatch(checkBackendStatus());
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(intervalId);
  }, [dispatch]);

  function handleCreatePostClick(collectionName: string) {
    if (onCreateEntryClick) {
      onCreateEntryClick(collectionName);
    }
  }

  const creatableCollections = Object.values(collections).filter(
    (collection: Collection) => !!collection.create,
  );

  const shouldShowLogo = logo?.show_in_header && logo?.src;

  return (
    <AppHeader>
      <AppHeaderContent>
        <nav>
          <AppHeaderNavList>
            {shouldShowLogo && (
              <AppHeaderLogo>
                <img src={logo?.src || logoUrl} alt="Logo" />
              </AppHeaderLogo>
            )}
            <li>
              <AppHeaderNavLink
                to="/"
                className={contentActive ? ACTIVE_CLASS_NAME : undefined}
              >
                <Icon type="page" />
                {t('app.header.content')}
              </AppHeaderNavLink>
            </li>
            {hasWorkflow && (
              <li>
                <AppHeaderNavLink
                  to="/workflow"
                  className={workflowActive ? ACTIVE_CLASS_NAME : undefined}
                >
                  <Icon type="workflow" />
                  {t('app.header.workflow')}
                </AppHeaderNavLink>
              </li>
            )}
            {showMediaButton && (
              <li>
                <AppHeaderButton onClick={openMediaLibrary}>
                  <Icon type="media-alt" />
                  {t('app.header.media')}
                </AppHeaderButton>
              </li>
            )}
          </AppHeaderNavList>
        </nav>
        <AppHeaderActions>
          {creatableCollections.length > 0 && (
            <Dropdown
              renderButton={() => (
                <AppHeaderQuickNewButton> {t('app.header.quickAdd')}</AppHeaderQuickNewButton>
              )}
              dropdownTopOverlap="30px"
              dropdownWidth="160px"
              dropdownPosition="left"
            >
              {creatableCollections.map((collection: Collection) => (
                <DropdownItem
                  key={collection.name}
                  label={collection.label_singular || collection.label}
                  onClick={() => handleCreatePostClick(collection.name)}
                />
              ))}
            </Dropdown>
          )}
          <SettingsDropdown
            displayUrl={displayUrl}
            isTestRepo={isTestRepo}
            imageUrl={user?.avatar_url}
            onLogoutClick={onLogoutClick}
          />
        </AppHeaderActions>
      </AppHeaderContent>
    </AppHeader>
  );
}

export default translate()(Header);
