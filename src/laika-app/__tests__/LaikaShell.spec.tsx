import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LaikaShellProvider, useLaikaShell } from '@/laika-app/LaikaShellContext';

describe('useLaikaShell', () => {
  it('reports closed and tolerates calls when outside the provider', () => {
    const { result } = renderHook(() => useLaikaShell());
    expect(result.current.isMobileSidebarOpen).toBe(false);
    // No-ops outside the provider should not throw
    act(() => {
      result.current.openMobileSidebar();
      result.current.closeMobileSidebar();
      result.current.toggleMobileSidebar();
    });
    expect(result.current.isMobileSidebarOpen).toBe(false);
  });

  it('toggles open state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LaikaShellProvider>{children}</LaikaShellProvider>
    );
    const { result } = renderHook(() => useLaikaShell(), { wrapper });

    expect(result.current.isMobileSidebarOpen).toBe(false);
    act(() => result.current.openMobileSidebar());
    expect(result.current.isMobileSidebarOpen).toBe(true);
    act(() => result.current.closeMobileSidebar());
    expect(result.current.isMobileSidebarOpen).toBe(false);
    act(() => result.current.toggleMobileSidebar());
    expect(result.current.isMobileSidebarOpen).toBe(true);
  });

  it('closes when a popstate event fires', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LaikaShellProvider>{children}</LaikaShellProvider>
    );
    const { result } = renderHook(() => useLaikaShell(), { wrapper });

    act(() => result.current.openMobileSidebar());
    expect(result.current.isMobileSidebarOpen).toBe(true);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.isMobileSidebarOpen).toBe(false);
  });

  it('children render inside the provider', () => {
    const { getByText } = render(
      <LaikaShellProvider>
        <div>shell child</div>
      </LaikaShellProvider>,
    );
    expect(getByText('shell child')).toBeInTheDocument();
  });
});
