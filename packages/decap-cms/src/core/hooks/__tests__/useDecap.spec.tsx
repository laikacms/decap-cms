import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { context } from '@/core/contexts/decap';
import { useDecap } from '@/core/hooks/useDecap';
import { defaultRoutingTable } from '@/core/routing/router';

import type { DecapCmsContext } from '@/core/contexts/decap';
import type { CmsConfig } from '@/lib/util';

const mockConfig = { backend: { name: 'test-repo' } } as unknown as CmsConfig;

function buildContextValue(): DecapCmsContext {
  return {
    config: mockConfig,
    theme: {},
    routing: defaultRoutingTable,
    router: {
      push: vi.fn(),
      replace: vi.fn(),
      getLocation: vi.fn(() => ({ pathname: '/', search: '' })),
      subscribe: vi.fn(() => () => {}),
    } as unknown as DecapCmsContext['router'],
    navigate: vi.fn(),
    params: vi.fn() as unknown as DecapCmsContext['params'],
    path: '/collections/posts',
  };
}

describe('useDecap', () => {
  it('returns the context value when rendered inside a provider', () => {
    const value = buildContextValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <context.Provider value={value}>{children}</context.Provider>
    );

    const { result } = renderHook(() => useDecap(), { wrapper });

    expect(result.current).toBe(value);
    expect(result.current.config).toBe(mockConfig);
    expect(result.current.path).toBe('/collections/posts');
  });

  it('throws the documented error when rendered outside a DecapCmsProvider', () => {
    expect(() => renderHook(() => useDecap())).toThrow('useDecap must be used within a DecapCmsProvider');
  });
});
