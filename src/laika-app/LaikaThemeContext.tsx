import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Global, css } from '@emotion/react';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';

import { DecapCmsProvider } from '@/core/index';
import { createDefaultRouter } from '@/core/routing/defaultRouter';
import { resolveTheme } from './laikaThemes';

import type { DecapCmsProviderProps } from '@/core/index';
import type { LaikaThemeMode } from './laikaThemes';

/**
 * Provides a Laika dark/light theme on top of `DecapCmsProvider` — without
 * touching core. Holds the user's mode preference in state, persists it to
 * `localStorage`, and reacts to OS `prefers-color-scheme` changes when the
 * mode is `'system'`.
 *
 * Consumers read or change the mode via the `useLaikaTheme()` hook. Other
 * apps that want the same primitive can build their own provider against
 * `DecapCmsProvider.theme` — this is just laika's convention.
 */

const STORAGE_KEY = 'laika-cms-theme-mode';
const MODES: LaikaThemeMode[] = ['light', 'dark', 'system'];

function readStoredMode(): LaikaThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (MODES as string[]).includes(raw)) {
      return raw as LaikaThemeMode;
    }
  } catch {
    // localStorage may be unavailable (privacy mode, SSR). Fall through.
  }
  return 'system';
}

function writeStoredMode(mode: LaikaThemeMode) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore quota or access errors; the in-memory state still updates.
  }
}

interface LaikaThemeContextValue {
  mode: LaikaThemeMode;
  setMode: (mode: LaikaThemeMode) => void;
  toggleMode: () => void;
  /** The resolved mode after `'system'` is collapsed to `'light'` or `'dark'`. */
  resolvedMode: 'light' | 'dark';
}

const LaikaThemeContext = createContext<LaikaThemeContextValue | null>(null);

export function useLaikaTheme(): LaikaThemeContextValue {
  const ctx = useContext(LaikaThemeContext);
  if (!ctx) {
    throw new Error('useLaikaTheme must be used inside a <LaikaThemeProvider>');
  }
  return ctx;
}

export interface LaikaThemeProviderProps {
  config?: DecapCmsProviderProps['config'];
  /**
   * Overrides the persisted mode. When supplied the provider becomes
   * controlled — the consumer is responsible for honoring `setMode` calls.
   */
  mode?: LaikaThemeMode;
  /** Called whenever the mode changes (controlled or uncontrolled). */
  onModeChange?: (mode: LaikaThemeMode) => void;
  children?: React.ReactNode;
}

export function LaikaThemeProvider({
  config,
  mode: modeProp,
  onModeChange,
  children,
}: LaikaThemeProviderProps) {
  // Laika owns its router: one hash-router instance for this shell's
  // lifetime, handed to `DecapCmsProvider` below and to the react-router
  // bridge, so core and laika's react-router components drive (and observe)
  // the same history.
  const [router] = useState(() => createDefaultRouter());
  const [internalMode, setInternalMode] = useState<LaikaThemeMode>(() => readStoredMode());
  const mode = modeProp ?? internalMode;

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = useCallback(
    (next: LaikaThemeMode) => {
      if (modeProp === undefined) {
        setInternalMode(next);
        writeStoredMode(next);
      }
      onModeChange?.(next);
    },
    [modeProp, onModeChange],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return systemDark ? 'dark' : 'light';
  }, [mode, systemDark]);

  const theme = useMemo(() => resolveTheme(mode), [mode]);

  const value = useMemo<LaikaThemeContextValue>(
    () => ({ mode, setMode, toggleMode, resolvedMode }),
    [mode, setMode, toggleMode, resolvedMode],
  );

  // Shadow tokens — emitted as CSS custom properties so laika components can
  // reference them without each one needing to read the theme context. The
  // dark mode values are darker + heavier so elevation reads on the
  // near-black background (a soft rgba(15,23,42,X) shadow is invisible in
  // dark mode since it matches the surface color).
  const shadowVars =
    resolvedMode === 'dark'
      ? css`
          :root {
            --laika-shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.45);
            --laika-shadow-strong: 0 12px 32px rgba(0, 0, 0, 0.55);
            --laika-shadow-overlay: rgba(0, 0, 0, 0.65);
          }
        `
      : css`
          :root {
            --laika-shadow-soft: 0 6px 18px rgba(15, 23, 42, 0.08);
            --laika-shadow-strong: 0 24px 64px rgba(15, 23, 42, 0.12);
            --laika-shadow-overlay: rgba(15, 23, 42, 0.5);
          }
        `;

  return (
    <LaikaThemeContext.Provider value={value}>
      <Global styles={shadowVars} />
      <Global styles={reducedMotionStyles} />
      <DecapCmsProvider config={config} theme={theme} router={router}>
        {/*
         * laika's own components still navigate via react-router-dom. Core no
         * longer provides a react-router context, so bridge one here, bound to
         * the same hash history instance our router wraps, so both stay in
         * sync. Remove once laika's components move onto the in-house router.
         */}
        <HistoryRouter history={router.history as never}>{children}</HistoryRouter>
      </DecapCmsProvider>
    </LaikaThemeContext.Provider>
  );
}

/**
 * Disable CSS transitions, animations, and smooth-scroll for users who set
 * "reduce motion" at the OS level. Vestibular sensitivity and anxiety-
 * triggered motion intolerance are common — laika's slide-in drawer,
 * dropdown opens, and theme transitions can all trigger symptoms. The
 * 0.01ms duration keeps the end state intact without animating to it.
 */
const reducedMotionStyles = css`
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export default LaikaThemeProvider;
