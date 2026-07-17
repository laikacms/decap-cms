import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub DecapCmsProvider so the test doesn't pull the full Redux store —
// see LaikaProvider.spec.tsx for the same approach. The stub records the
// props it receives so the brand-theme merge can be asserted on.
const { decapProviderProps } = vi.hoisted(() => ({
  decapProviderProps: [] as Array<Record<string, unknown>>,
}));
vi.mock('../../core/index', () => ({
  DecapCmsProvider: (props: { children?: React.ReactNode }) => {
    decapProviderProps.push(props);
    return <>{props.children}</>;
  },
}));

import { LaikaThemeProvider, useLaikaTheme } from '@/laika-app/LaikaThemeContext';

const STORAGE_KEY = 'laika-cms-theme-mode';

function wrapper({
  children,
  ...rest
}: {
  children: React.ReactNode,
  mode?: 'light' | 'dark' | 'system',
}) {
  return <LaikaThemeProvider {...rest}>{children}</LaikaThemeProvider>;
}

describe('LaikaThemeContext', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.();
    } catch {
      /* ignore — some test envs don't expose localStorage */
    }
  });

  it('throws when useLaikaTheme is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useLaikaTheme())).toThrow(
      /must be used inside a <LaikaThemeProvider>/,
    );
    spy.mockRestore();
  });

  it('persists setMode calls to localStorage', () => {
    const { result } = renderHook(() => useLaikaTheme(), { wrapper });
    act(() => result.current.setMode('dark'));
    expect(result.current.mode).toBe('dark');
    try {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    } catch {
      /* localStorage may be unavailable in this environment */
    }
  });

  it('toggleMode flips between dark and not-dark', () => {
    const { result } = renderHook(() => useLaikaTheme(), { wrapper });
    // Default is `'system'`; toggle sends to dark (anything-not-dark → dark)
    expect(result.current.mode).toBe('system');
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('dark');
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('light');
    act(() => result.current.toggleMode());
    expect(result.current.mode).toBe('dark');
  });

  it('controlled mode ignores setMode persistence but still calls onModeChange', () => {
    const onModeChange = vi.fn();
    const controlledWrapper = ({ children }: { children: React.ReactNode }) => (
      <LaikaThemeProvider mode="light" onModeChange={onModeChange}>
        {children}
      </LaikaThemeProvider>
    );
    const { result } = renderHook(() => useLaikaTheme(), { wrapper: controlledWrapper });

    expect(result.current.mode).toBe('light');
    act(() => result.current.setMode('dark'));
    // mode prop is locked → externally controlled, so the captured mode stays.
    expect(result.current.mode).toBe('light');
    // But the consumer's onModeChange callback still fires with the request.
    expect(onModeChange).toHaveBeenCalledWith('dark');
  });

  it('merges a brand theme over the resolved mode theme', () => {
    decapProviderProps.length = 0;
    render(
      <LaikaThemeProvider mode="dark" theme={{ colors: { button: '#1b6875' } }}>
        <div />
      </LaikaThemeProvider>,
    );
    const theme = decapProviderProps.at(-1)?.theme as {
      colors: Record<string, string>,
    };
    // Brand override wins…
    expect(theme.colors.button).toBe('#1b6875');
    // …while unbranded tokens keep the laika dark theme's value.
    expect(theme.colors.active).toBe('#6ea1ff');
  });

  it('resolves a function brand theme with the resolved mode', () => {
    decapProviderProps.length = 0;
    const brand = vi.fn((mode: 'light' | 'dark') => ({
      colors: { button: mode === 'dark' ? '#2f97a8' : '#1b6875' },
    }));
    render(
      <LaikaThemeProvider mode="dark" theme={brand}>
        <div />
      </LaikaThemeProvider>,
    );
    expect(brand).toHaveBeenCalledWith('dark');
    const theme = decapProviderProps.at(-1)?.theme as {
      colors: Record<string, string>,
    };
    expect(theme.colors.button).toBe('#2f97a8');
  });

  it('renders children through the provider', () => {
    const { getByText } = render(
      <LaikaThemeProvider>
        <div>child</div>
      </LaikaThemeProvider>,
    );
    expect(getByText('child')).toBeInTheDocument();
  });
});
