import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import type * as DecapCmsUiDefault from 'decap-cms-ui-default';

import { Sidebar } from '../Sidebar';

vi.mock('decap-cms-ui-default', async () => {
  const actual = await vi.importActual<typeof DecapCmsUiDefault>('decap-cms-ui-default');
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
    const { asFragment, getByTestId } = render(
      <MemoryRouter>
        <Sidebar {...props} collections={collections} />
      </MemoryRouter>,
    );

    expect(getByTestId('posts')).toHaveTextContent('Posts');
    expect(getByTestId('posts')).toHaveAttribute('href', '/collections/posts');

    expect(asFragment()).toMatchSnapshot();
  });

  it('should not render a hidden collection', () => {
    const collections = { posts: { name: 'posts', label: 'Posts', hide: true } };
    const { queryByTestId } = render(
      <MemoryRouter>
        <Sidebar {...props} collections={collections} />
      </MemoryRouter>,
    );

    expect(queryByTestId('posts')).toBeNull();
  });

  it('should render sidebar with a nested collection', () => {
    const collections = { posts: { name: 'posts', label: 'Posts', nested: { depth: 10 } } };
    const { asFragment } = render(
      <MemoryRouter>
        <Sidebar {...props} collections={collections} />
      </MemoryRouter>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('should render nested collection with filterTerm', () => {
    const collections = { posts: { name: 'posts', label: 'Posts', nested: { depth: 10 } } };
    const { asFragment } = render(
      <MemoryRouter>
        <Sidebar {...props} collections={collections} filterTerm="dir1/dir2" />
      </MemoryRouter>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('should render sidebar without search', () => {
    const collections = { posts: { name: 'posts', label: 'Posts' } };
    const { asFragment } = render(
      <MemoryRouter>
        <Sidebar {...props} collections={collections} isSearchEnabled={false} />
      </MemoryRouter>,
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
