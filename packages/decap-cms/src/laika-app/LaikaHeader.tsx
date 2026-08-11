import { Menu } from '@base-ui/react/menu';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import { NavLink } from 'react-router-dom';

import { checkBackendStatus } from '@/core/actions/status';
import { OfflineIndicator, SettingsDropdown } from '@/core/components/UI';
import { useCurrentUserScopes } from '@/core/hooks/useCurrentUserScopes';
import { useAppDispatch } from '@/core/hooks/useRedux';
import { translate } from '@/core/i18n';
import { canEditCollection } from '@/core/lib/collectionAccess';
import { buttons, colors, components, Icon, lengths, zIndex } from '@/ui/default/index';
import { LAIKA_BREAKPOINT_MOBILE, useLaikaShell } from './LaikaShellContext';
import { useLaikaTheme } from './LaikaThemeContext';
import { LaikaIconButton } from './ui';

import type { AppHeaderRenderProps } from '@/app/components/App';
import type { TranslateFunction } from '@/ui/default/index';

/**
 * Laika-styled top app bar. Same surface area as the default Decap header —
 * collection nav, workflow link, media button, quick-add, and the user
 * settings dropdown — re-skinned to match the Daniel-Mendes `next`-branch
 * AppBar look: flat sticky bar, rounded pill buttons, soft elevation, the
 * brand mark on the left rather than a tab row.
 *
 * Built deliberately as a thin, composable shell on top of the v4.beta core —
 * everything Redux-flavored is fed in via `AppHeaderRenderProps`, so this
 * component is a pure presentational unit.
 */

const HeaderShell = styled.header`
  position: sticky;
  top: 0;
  width: 100%;
  height: ${lengths.topBarHeight};
  background-color: ${colors.foreground};
  border-bottom: 1px solid ${colors.textFieldBorder};
  z-index: ${zIndex.zIndex300};
  display: flex;
  align-items: stretch;
`;

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1440px;
  padding: 0 20px;
  margin: 0 auto;
  gap: 16px;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const MobileOnly = styled.div`
  display: none;

  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    display: inline-flex;
    align-items: center;
  }
`;

const BrandHomeLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: ${colors.textLead};
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
  }
`;

const BrandLogo = styled.img`
  max-height: 32px;
  max-width: 160px;
  object-fit: contain;
`;

const NavList = styled.ul`
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    /* The header nav (Workflow / Media / Quick add) won't fit alongside the
       brand, theme toggle, and avatar on narrow viewports. Quick add and
       Media are reachable via the command palette (Cmd+K); Workflow is in
       the sidebar. */
    display: none;
  }
`;

const navItemStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.controlLabel};
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
  }

  /* react-router NavLink v6+ auto-applies the .active class. We avoid
     passing a className-function override because emotion's styled() wraps
     NavLink and stringifies any function-form className it receives,
     leaking the function source into the rendered DOM. */
  &.active {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
  }
`;

const NavLinkStyled = styled(NavLink)`
  ${navItemStyles};
`;

const NavButton = styled.button`
  ${navItemStyles};
`;

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    /* Core's SettingsDropdown renders the "Test Backend ↗" indicator and the
       displayUrl as inline <a target="_blank"> links next to the avatar.
       They eat 200px+ of horizontal space on narrow viewports and force the
       header to overflow. The dropdown menu (Logout etc.) is still reachable
       via the avatar button, so hide the inline indicators only on mobile. */
    a[target='_blank'] {
      display: none;
    }
  }
`;

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const QuickAddTrigger = styled(Menu.Trigger)`
  ${buttons.button};
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 36px;
  /* the caret sits at right: 10px and is 12px wide; keep clearance for it */
  padding: 0 32px 0 14px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.buttonText};
  background-color: ${colors.button};
  border: none;
  cursor: pointer;

  &:hover,
  &:focus-visible,
  &[data-popup-open] {
    background-color: ${colors.active};
    color: ${colors.foreground};
  }

  &:after {
    ${components.caretDown};
    content: '';
    display: block;
    position: absolute;
    top: 14px;
    right: 10px;
    color: currentColor;
  }
`;

const QuickAddPositioner = styled(Menu.Positioner)`
  z-index: ${zIndex.zIndex300};
`;

const QuickAddMenu = styled(Menu.Popup)`
  ${components.dropdownList};
  width: 200px;
  margin: 0;
  font-size: 14px;
  outline: none;
`;

const QuickAddMenuItem = styled(Menu.Item)`
  ${components.dropdownItem};
  width: 100%;
  text-align: left;
  font-size: 14px;

  &[data-highlighted] {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
    outline: none;
  }
`;

interface LaikaHeaderProps extends AppHeaderRenderProps {
  t: TranslateFunction;
}

function LaikaHeader({
  user,
  collections,
  onCreateEntryClick,
  onLogoutClick,
  openMediaLibrary,
  hasWorkflow,
  displayUrl,
  showMediaButton,
  logoUrl,
  logo,
  isTestRepo,
  t,
}: LaikaHeaderProps) {
  const dispatch = useAppDispatch();
  const { resolvedMode, toggleMode } = useLaikaTheme();
  const { isMobileSidebarOpen, toggleMobileSidebar } = useLaikaShell();
  const quickAddMenuId = React.useId();

  React.useEffect(() => {
    const id = setInterval(
      () => {
        dispatch(checkBackendStatus());
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [dispatch]);

  const userScopes = useCurrentUserScopes();
  const creatableCollections = Object.values(collections).filter(
    c => !!c.create && canEditCollection(c, userScopes),
  );
  const brandLogo = logo?.show_in_header && (logo?.src || logoUrl);

  return (
    <HeaderShell>
      <HeaderInner>
        <MobileOnly>
          <LaikaIconButton
            aria-label={isMobileSidebarOpen ? 'Close menu' : 'Open menu'}
            active={isMobileSidebarOpen}
            onClick={toggleMobileSidebar}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </LaikaIconButton>
        </MobileOnly>
        <Brand>
          <BrandHomeLink to="/" end aria-label="Home">
            {brandLogo ? <BrandLogo src={logo?.src || logoUrl} alt="" /> : <Icon type="home" />}
          </BrandHomeLink>
          <nav>
            <NavList>
              {hasWorkflow
                ? (
                  <li>
                    <NavLinkStyled to="/workflow">
                      <Icon type="workflow" />
                      {t('app.header.workflow')}
                    </NavLinkStyled>
                  </li>
                )
                : null}
              {showMediaButton
                ? (
                  <li>
                    <NavButton type="button" onClick={openMediaLibrary}>
                      <Icon type="media-alt" />
                      {t('app.header.media')}
                    </NavButton>
                  </li>
                )
                : null}
            </NavList>
          </nav>
        </Brand>

        <Actions>
          <OfflineIndicator />
          {creatableCollections.length > 0
            ? (
              <Menu.Root>
                <QuickAddTrigger>{t('app.header.quickAdd')}</QuickAddTrigger>
                <Menu.Portal>
                  <QuickAddPositioner align="end" sideOffset={0}>
                    {
                      /* Base UI links the trigger's aria-controls to this id while
                      the menu is open. */
                    }
                    <QuickAddMenu id={quickAddMenuId}>
                      {creatableCollections.map(collection => (
                        <QuickAddMenuItem
                          key={collection.name}
                          onClick={() => onCreateEntryClick(collection.name)}
                        >
                          {collection.label_singular || collection.label}
                        </QuickAddMenuItem>
                      ))}
                    </QuickAddMenu>
                  </QuickAddPositioner>
                </Menu.Portal>
              </Menu.Root>
            )
            : null}
          <LaikaIconButton
            onClick={toggleMode}
            aria-label={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          </LaikaIconButton>
          <SettingsDropdown
            displayUrl={displayUrl}
            isTestRepo={isTestRepo}
            imageUrl={user?.avatar_url as string | undefined}
            onLogoutClick={onLogoutClick}
          />
        </Actions>
      </HeaderInner>
    </HeaderShell>
  );
}

export default translate()(LaikaHeader);
