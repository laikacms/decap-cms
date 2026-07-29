import styled from '@emotion/styled';
import React from 'react';

import LaikaCommandPalette from './LaikaCommandPalette';
import { LAIKA_BREAKPOINT_MOBILE } from './LaikaShellContext';
import LaikaShortcutHelp from './LaikaShortcutHelp';
import LaikaShortcuts from './LaikaShortcuts';
import LaikaSidebar from './LaikaSidebar';

import type { AppLayoutRenderProps } from '@/app/components/index';

/**
 * Sidebar + main shell, supplied to `core.App` via `renderLayout`. The
 * routed content (collections / editor / workflow / media library) comes
 * in as `main`; we just position it next to the LaikaSidebar.
 */

const LayoutRow = styled.div`
  display: flex;
  align-items: flex-start;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  gap: 0;
`;

const MainArea = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 20px;
  box-sizing: border-box;

  /* On mobile the sidebar collapses to a drawer overlaying the page, so
     reclaim the full width here. */
  @media (max-width: ${LAIKA_BREAKPOINT_MOBILE}px) {
    padding: 0 16px;
    width: 100%;
  }
`;

function LaikaLayout({ main, headerProps, isEditorRoute }: AppLayoutRenderProps) {
  return (
    <>
      <LayoutRow>
        {
          /* The entry editor renders its own full-bleed header/toolbar over
            the same viewport region as this sidebar (`EditorContainer` is
            `position: absolute; top: 0; left: 0; width: 100%`, per
            `EditorInterface.tsx` — see DCMS-431). Mounting the sidebar
            underneath it leaves an invisible-yet-focusable/clickable `<aside>`
            occupying the editor toolbar's top-left corner, intercepting
            pointer events aimed at the breadcrumb `Posts` link (DCMS-1651).
            `isEditorRoute` exists on `AppLayoutRenderProps` for exactly this
            case (see its doc comment in `App.tsx`); unmount rather than layer
            a z-index/pointer-events patch on top of it, matching how the
            app-shell header is already unmounted for editor routes. */
        }
        {!isEditorRoute && (
          <LaikaSidebar collections={headerProps.collections} userScopes={headerProps.user.scopes} />
        )}
        <MainArea>{main}</MainArea>
      </LayoutRow>
      <LaikaCommandPalette />
      <LaikaShortcuts />
      <LaikaShortcutHelp />
    </>
  );
}

export default LaikaLayout;
