import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Provides cross-component state for the laika shell:
 *
 * - "is the mobile sidebar drawer open": LaikaHeader needs to know (so the
 *   hamburger button reflects state) and LaikaSidebar needs to know (so it
 *   renders as a drawer vs static rail). Since header and sidebar live in
 *   different render slots there's no parent JSX to thread state through.
 * - "is the command palette open": LaikaCommandPalette (mounted in
 *   LaikaLayout) owns the dialog, but other surfaces open it too: the
 *   Cmd+K/Ctrl+K shortcut and the shortcut badge in the sidebar search bar
 *   (LaikaCollectionSearch).
 * - "is the shortcut help open": LaikaShortcutHelp (mounted in LaikaLayout)
 *   owns the dialog; the '?' shortcut (LaikaShortcuts) and the palette's
 *   "Keyboard shortcuts" command open it.
 *
 * The provider also auto-closes the drawer on route changes, so navigating
 * from the mobile sidebar doesn't leave it open behind the user.
 */

interface LaikaShellContextValue {
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  isShortcutHelpOpen: boolean;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  toggleShortcutHelp: () => void;
}

const LaikaShellContext = createContext<LaikaShellContextValue | null>(null);

export function useLaikaShell(): LaikaShellContextValue {
  const ctx = useContext(LaikaShellContext);
  if (!ctx) {
    // Tolerate being read outside the provider (e.g. in tests). All actions
    // become no-ops; sidebar reports closed.
    return {
      isMobileSidebarOpen: false,
      openMobileSidebar: () => undefined,
      closeMobileSidebar: () => undefined,
      toggleMobileSidebar: () => undefined,
      isCommandPaletteOpen: false,
      openCommandPalette: () => undefined,
      closeCommandPalette: () => undefined,
      toggleCommandPalette: () => undefined,
      isShortcutHelpOpen: false,
      openShortcutHelp: () => undefined,
      closeShortcutHelp: () => undefined,
      toggleShortcutHelp: () => undefined,
    };
  }
  return ctx;
}

export function LaikaShellProvider({ children }: { children?: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // Auto-close the drawer on any browser-history navigation. This lives
  // OUTSIDE the router on purpose so the provider can be mounted above
  // <HistoryRouter> alongside the theme provider.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function close() {
      setIsMobileSidebarOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('popstate', close);
    window.addEventListener('hashchange', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', close);
      window.removeEventListener('hashchange', close);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen(v => !v), []);

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen(v => !v), []);

  const openShortcutHelp = useCallback(() => setIsShortcutHelpOpen(true), []);
  const closeShortcutHelp = useCallback(() => setIsShortcutHelpOpen(false), []);
  const toggleShortcutHelp = useCallback(() => setIsShortcutHelpOpen(v => !v), []);

  const value = useMemo<LaikaShellContextValue>(
    () => ({
      isMobileSidebarOpen,
      openMobileSidebar,
      closeMobileSidebar,
      toggleMobileSidebar,
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      isShortcutHelpOpen,
      openShortcutHelp,
      closeShortcutHelp,
      toggleShortcutHelp,
    }),
    [
      isMobileSidebarOpen,
      openMobileSidebar,
      closeMobileSidebar,
      toggleMobileSidebar,
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      isShortcutHelpOpen,
      openShortcutHelp,
      closeShortcutHelp,
      toggleShortcutHelp,
    ],
  );

  return <LaikaShellContext.Provider value={value}>{children}</LaikaShellContext.Provider>;
}

export const LAIKA_BREAKPOINT_MOBILE = 900;
