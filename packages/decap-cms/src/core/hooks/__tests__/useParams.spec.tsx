import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { context } from '@/core/contexts/decap';
import { useParams } from '@/core/hooks/useParams';
import { defaultRoutingTable } from '@/core/routing/router';

import type { DecapCmsContext } from '@/core/contexts/decap';
import type { CmsConfig } from '@/lib/util';

function wrapperFor(path: string) {
  const value: DecapCmsContext = {
    config: { backend: { name: 'test-repo' } } as unknown as CmsConfig,
    theme: {},
    routing: defaultRoutingTable,
    router: {} as unknown as DecapCmsContext['router'],
    navigate: (() => {}) as unknown as DecapCmsContext['navigate'],
    params: (key => defaultRoutingTable[key].get(path)) as DecapCmsContext['params'],
    path,
  };
  return ({ children }: { children: React.ReactNode }) => <context.Provider value={value}>{children}</context.Provider>;
}

describe('useParams', () => {
  it('returns the params parsed from the current path for the given route key', () => {
    const path = defaultRoutingTable.collection.create({ collectionName: 'posts' });

    const { result } = renderHook(() => useParams('collection'), { wrapper: wrapperFor(path) });

    expect(result.current).toEqual({ collectionName: 'posts' });
  });

  it('returns multiple params for entry routes', () => {
    const path = defaultRoutingTable.entry.create({ collectionName: 'posts', slug: 'hello-world' });

    const { result } = renderHook(() => useParams('entry'), { wrapper: wrapperFor(path) });

    expect(result.current).toEqual({ collectionName: 'posts', slug: 'hello-world' });
  });

  it('throws when the current path does not match the requested route', () => {
    expect(() => renderHook(() => useParams('entry'), { wrapper: wrapperFor('/') })).toThrow();
  });
});
