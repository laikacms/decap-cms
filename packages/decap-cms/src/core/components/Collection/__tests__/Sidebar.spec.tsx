import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '@/core/components/Collection/Sidebar';
import { RouterProvider } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';

import type * as DecapCmsUiDefault from '@/ui/default/index';

vi.mock('../../../../ui/default/index', async () => {
  const actual = await vi.importActual<typeof DecapCmsUiDefault>('../../../../ui/default/index');
  return {
    ...actual,
    Icon: 'mocked-icon',
  };
});

vi.mock('../NestedCollection', () => ({ default: 'nested-collection' }));
vi.mock('../CollectionSearch', () => ({ default: 'collection-search' }));
vi.mock('../../../actions/collections');

describe('Sidebar', () => {
  const props = {
    searchTerm: '',
    isSearchEnabled: true,
    t: vi.fn(key => key),
  };
  it('should render sidebar with a simple collection', () => {
    const collections = { posts: { name: 'posts', label: 'Posts' } };
    const { getByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <Sidebar {...props} collections={collections} />
      </RouterProvider>,
    );

    expect(getByTestId('posts')).toHaveTextContent('Posts');
    expect(getByTestId('posts')).toHaveAttribute('href', '#/collections/posts');
  });

  it('should not render a hidden collection', () => {
    const collections = { posts: { name: 'posts', label: 'Posts', hide: true } };
    const { queryByTestId } = render(
      <RouterProvider router={createDefaultRouter()}>
        <Sidebar {...props} collections={collections} />
      </RouterProvider>,
    );

    expect(queryByTestId('posts')).toBeNull();
  });
});
