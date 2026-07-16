import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock DecapCmsProvider so the test doesn't need a real Redux store, config
// loader, or i18n setup. We only want to verify that LaikaProvider wires up
// both laika contexts and renders children. Avoid `vi.importActual` here —
// it would re-evaluate the entire core module graph and trip over Redux
// store setup that depends on browser globals not present in JSDOM bootstrap.
vi.mock('../../core/index', () => ({
  DecapCmsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import LaikaProvider from '@/laika-app/LaikaProvider';
import { useLaikaShell } from '@/laika-app/LaikaShellContext';
import { useLaikaTheme } from '@/laika-app/LaikaThemeContext';

function Probe() {
  const theme = useLaikaTheme();
  const shell = useLaikaShell();
  return (
    <div>
      <span data-testid="resolved-mode">{theme.resolvedMode}</span>
      <span data-testid="sidebar-open">{String(shell.isMobileSidebarOpen)}</span>
    </div>
  );
}

describe('LaikaProvider', () => {
  it('renders children inside the combined laika contexts', () => {
    const { getByTestId } = render(
      <LaikaProvider>
        <Probe />
      </LaikaProvider>,
    );
    expect(getByTestId('resolved-mode').textContent).toMatch(/^(light|dark)$/);
    expect(getByTestId('sidebar-open').textContent).toBe('false');
  });

  it('respects controlled mode prop', () => {
    function ThemeProbe() {
      const theme = useLaikaTheme();
      return <span data-testid="mode">{theme.mode}</span>;
    }
    const { getByTestId } = render(
      <LaikaProvider mode="dark">
        <ThemeProbe />
      </LaikaProvider>,
    );
    expect(getByTestId('mode').textContent).toBe('dark');
  });
});
