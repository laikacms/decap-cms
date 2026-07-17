/** @jsxImportSource @emotion/react */
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

function LaikaLayout({ main, headerProps }: AppLayoutRenderProps) {
  return (
    <>
      <LayoutRow>
        <LaikaSidebar collections={headerProps.collections} />
        <MainArea>{main}</MainArea>
      </LayoutRow>
      <LaikaCommandPalette />
      <LaikaShortcuts />
      <LaikaShortcutHelp />
    </>
  );
}

export default LaikaLayout;
