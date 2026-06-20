/** @jsxImportSource @emotion/react */
import React from 'react';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { NavLink } from 'react-router-dom';

import { Icon, colors, lengths, zIndex } from '../ui-default/index';
import LaikaCollectionSearch from './LaikaCollectionSearch';
import { useLaikaShell, LAIKA_BREAKPOINT_MOBILE } from './LaikaShellContext';
import { laikaShouldForwardProp } from './ui/styled-utils';

import type { TranslateFunction } from '../ui-default/index';
import type { CmsCollections, CmsCollectionState } from '../lib-util/index';

/**
 * Laika-styled left sidebar, inspired by the Daniel-Mendes `next`-branch
 * NavMenu. Pure presentational unit — pass collections in, get a sidebar
 * out. Highlights the active collection via `NavLink` and supports an
 * optional collection click handler for hosts that need custom routing.
 *
 * Use via `renderLayout` on `core.App` / `core.AppContent`; the layout
 * supplies the collections list from the `headerProps` payload.
 */

const SidebarShell = styled('aside', { shouldForwardProp: laikaShouldForwardProp })<{
  $isMobileOpen?: boolean;
}>`
  position: sticky;
  top: ${lengths.topBarHeight};
  align-self: flex-start;
  width: 260px;
  flex-shrink: 0;
  padding: 24px 12px;
  border-right: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.background};
  max-height: calc(100vh - ${lengths.topBarHeight});
  overflow-y: auto;
  box-sizing: border-box;

  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    position: fixed;
    top: ${lengths.topBarHeight};
    left: 0;
    bottom: 0;
    max-height: calc(100vh - ${lengths.topBarHeight});
    z-index: ${zIndex.zIndex299};
    width: 280px;
    transform: translateX(${({ $isMobileOpen }) => ($isMobileOpen ? '0' : '-100%')});
    transition: transform 0.2s ease;
    box-shadow: ${({ $isMobileOpen }) =>
      $isMobileOpen ? 'var(--laika-shadow-strong, 12px 0 32px rgba(15, 23, 42, 0.18))' : 'none'};
  }
`;

const Backdrop = styled.div`
  display: none;

  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    display: block;
    position: fixed;
    top: ${lengths.topBarHeight};
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${zIndex.zIndex200};
    background-color: var(--laika-shadow-overlay, rgba(15, 23, 42, 0.4));
  }
`;

const SidebarSection = styled.section`
  & + & {
    margin-top: 24px;
  }
`;

const SidebarSectionHeading = styled.h3`
  margin: 0 12px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.controlLabel};
  opacity: 0.7;
`;

const SidebarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SidebarListItem = styled.li`
  margin: 2px 0;
`;

const SidebarLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.controlLabel};
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
    outline: none;
  }

  /* NavLink v6+ adds the .active class automatically when the route is
     active. We deliberately don't pass a className-function override here:
     emotion's styled() wraps NavLink and stringifies any function-form
     className it receives, which would leak the function source into the
     rendered DOM. */
  &.active {
    color: ${colors.active};
    background-color: ${colors.activeBackground};
  }
`;

const SidebarLinkLabel = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SidebarLinkBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 9999px;
  background-color: ${colors.activeBackground};
  color: ${colors.controlLabel};
`;

/**
 * Sectioned view of the collections list. Folder collections and file
 * collections each get their own labeled group when both are present, so the
 * sidebar reads like a navigable map rather than a flat dump.
 */
function partitionCollections(collections: CmsCollections) {
  const visible = Object.values(collections).filter(c => c.hide !== true);
  const folders = visible.filter(c => c.type === 'folder_based_collection');
  const files = visible.filter(c => c.type === 'file_based_collection');
  return { folders, files };
}

/** A single host-supplied nav entry rendered in the Laika sidebar. */
export interface LaikaNavItem {
  /** Router path (passed straight to `NavLink`). */
  to: string;
  label: React.ReactNode;
  /** `ui-default` `Icon` type; defaults to `'page'`. */
  icon?: string;
  badge?: React.ReactNode;
  /** Match the route exactly — forwarded to `NavLink`'s `end`. */
  end?: boolean;
}

/** A labelled group of host-supplied nav entries. */
export interface LaikaNavSection {
  heading?: React.ReactNode;
  items: LaikaNavItem[];
}

export interface LaikaSidebarProps {
  collections: CmsCollections;
  /**
   * Optional click handler. The default behavior — navigation via `NavLink` —
   * still runs; this fires alongside for analytics or custom side-effects.
   */
  onCollectionClick?: (collection: CmsCollectionState) => void;
  /**
   * Extra nav sections rendered after the CMS collections and before the
   * Settings link. Lets a host mount custom admin pages (e.g. a shop admin)
   * in the same sidebar as the collections — pair with `core.App`'s
   * `extraRoutes` to register the matching routes.
   */
  extraNavSections?: LaikaNavSection[];
  t: TranslateFunction;
}

function LaikaSidebar({ collections, onCollectionClick, extraNavSections, t }: LaikaSidebarProps) {
  const { folders, files } = partitionCollections(collections);
  const showSectionHeadings = folders.length > 0 && files.length > 0;
  const { isMobileSidebarOpen, closeMobileSidebar } = useLaikaShell();

  const renderItem = (collection: CmsCollectionState) => (
    <SidebarListItem key={collection.name}>
      <SidebarLink
        to={`/collections/${collection.name}`}
        onClick={() => onCollectionClick?.(collection)}
      >
        <Icon type={collection.type === 'file_based_collection' ? 'page' : 'write'} />
        <SidebarLinkLabel>{collection.label}</SidebarLinkLabel>
        {Array.isArray(collection.files) && collection.files.length > 0 ? (
          <SidebarLinkBadge>{collection.files.length}</SidebarLinkBadge>
        ) : null}
      </SidebarLink>
    </SidebarListItem>
  );

  const renderNavItem = (item: LaikaNavItem) => (
    <SidebarListItem key={item.to}>
      <SidebarLink to={item.to} end={item.end}>
        <Icon type={item.icon ?? 'page'} />
        <SidebarLinkLabel>{item.label}</SidebarLinkLabel>
        {item.badge != null ? <SidebarLinkBadge>{item.badge}</SidebarLinkBadge> : null}
      </SidebarLink>
    </SidebarListItem>
  );

  return (
    <>
      {isMobileSidebarOpen ? <Backdrop aria-hidden="true" onClick={closeMobileSidebar} /> : null}
      <SidebarShell
        aria-label={t('collection.sidebar.collections')}
        data-mobile-open={isMobileSidebarOpen ? 'true' : 'false'}
        $isMobileOpen={isMobileSidebarOpen}
        onClick={event => {
          // Close the mobile drawer when any nav link inside is clicked —
          // the popstate listener doesn't fire for `history.push` calls.
          const target = event.target as HTMLElement;
          if (target.closest('a[href]')) {
            closeMobileSidebar();
          }
        }}
      >
        <LaikaCollectionSearch />
        {folders.length > 0 ? (
          <SidebarSection>
            {showSectionHeadings ? <SidebarSectionHeading>Folders</SidebarSectionHeading> : null}
            <SidebarList>{folders.map(renderItem)}</SidebarList>
          </SidebarSection>
        ) : null}
        {files.length > 0 ? (
          <SidebarSection>
            {showSectionHeadings ? <SidebarSectionHeading>Files</SidebarSectionHeading> : null}
            <SidebarList>{files.map(renderItem)}</SidebarList>
          </SidebarSection>
        ) : null}
        {(extraNavSections ?? []).map((section, index) =>
          section.items.length > 0 ? (
            <SidebarSection key={`extra-${index}`}>
              {section.heading ? (
                <SidebarSectionHeading>{section.heading}</SidebarSectionHeading>
              ) : null}
              <SidebarList>{section.items.map(renderNavItem)}</SidebarList>
            </SidebarSection>
          ) : null,
        )}
        <SidebarSection>
          <SidebarList>
            <SidebarListItem>
              <SidebarLink to="/settings">
                <Icon type="settings" />
                <SidebarLinkLabel>Settings</SidebarLinkLabel>
              </SidebarLink>
            </SidebarListItem>
          </SidebarList>
        </SidebarSection>
      </SidebarShell>
    </>
  );
}

export default translate()(LaikaSidebar);
