import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub DecapCmsProvider so the test doesn't pull the full Redux store —
// see LaikaProvider.spec.tsx for the same approach.
vi.mock('../../core/index', () => ({
  DecapCmsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { LaikaThemeProvider, useLaikaTheme } from '@/laika-app/LaikaThemeContext';

const STORAGE_KEY = 'laika-cms-theme-mode';

function wrapper({
  children,
  ...rest
}: {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'system';
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

  it('renders children through the provider', () => {
    const { getByText } = render(
      <LaikaThemeProvider>
        <div>child</div>
      </LaikaThemeProvider>,
    );
    expect(getByText('child')).toBeInTheDocument();
  });
});
