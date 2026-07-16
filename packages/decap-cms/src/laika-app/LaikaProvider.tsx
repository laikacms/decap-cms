import React from 'react';

import { LaikaShellProvider } from './LaikaShellContext';
import { LaikaThemeProvider } from './LaikaThemeContext';

import type { LaikaThemeProviderProps } from './LaikaThemeContext';

/**
 * Single-entry-point provider that mounts both `LaikaThemeProvider` (dark
 * mode + theme persistence) and `LaikaShellProvider` (mobile drawer state
 * + popstate-driven auto-close) in the right order. Equivalent to:
 *
 *     <LaikaThemeProvider config={config}>
 *       <LaikaShellProvider>
 *         {children}
 *       </LaikaShellProvider>
 *     </LaikaThemeProvider>
 *
 * Use this when composing the laika shell inside a host React tree. The
 * `init()` exported from `@laikacms/decap-cms/laika-app` uses it internally;
 * downstream apps that already control their own root can mount this
 * directly around `<LaikaApp />` (or any subset of laika components).
 */

export interface LaikaProviderProps extends LaikaThemeProviderProps {}

export function LaikaProvider({ children, ...themeProps }: LaikaProviderProps) {
  return (
    <LaikaThemeProvider {...themeProps}>
      <LaikaShellProvider>{children}</LaikaShellProvider>
    </LaikaThemeProvider>
  );
}

export default LaikaProvider;
