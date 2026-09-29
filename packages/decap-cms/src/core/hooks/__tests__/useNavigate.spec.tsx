import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { context } from '@/core/contexts/decap';
import { useNavigate } from '@/core/hooks/useNavigate';
import { defaultRoutingTable } from '@/core/routing/router';

import type { DecapCmsContext } from '@/core/contexts/decap';
import type { CmsConfig } from '@/lib/util';

function buildContextValue(navigate: DecapCmsContext['navigate']): DecapCmsContext {
  return {
    config: { backend: { name: 'test-repo' } } as unknown as CmsConfig,
    theme: {},
    routing: defaultRoutingTable,
    router: {} as unknown as DecapCmsContext['router'],
    navigate,
    params: vi.fn() as unknown as DecapCmsContext['params'],
    path: '/',
  };
}

describe('useNavigate', () => {
  it('returns the navigate function from the decap context', () => {
    const navigate = vi.fn() as unknown as DecapCmsContext['navigate'];
    const value = buildContextValue(navigate);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <context.Provider value={value}>{children}</context.Provider>
    );

    const { result } = renderHook(() => useNavigate(), { wrapper });

    expect(result.current).toBe(navigate);
    result.current('collection', { collectionName: 'posts' });
    expect(navigate).toHaveBeenCalledWith('collection', { collectionName: 'posts' });
  });

  it('keeps the same reference across rerenders while the context is unchanged', () => {
    const value = buildContextValue(vi.fn() as unknown as DecapCmsContext['navigate']);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <context.Provider value={value}>{children}</context.Provider>
    );

    const { result, rerender } = renderHook(() => useNavigate(), { wrapper });
    const first = result.current;
    rerender();
    rerender();

    expect(result.current).toBe(first);
  });

  it('throws outside a DecapCmsProvider', () => {
    expect(() => renderHook(() => useNavigate())).toThrow('useDecap must be used within a DecapCmsProvider');
  });
});
