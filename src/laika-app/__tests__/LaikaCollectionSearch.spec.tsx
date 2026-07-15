import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

const searchCollections = vi.fn();
vi.mock('../../core/actions/collections', () => ({
  searchCollections: (...args: unknown[]) => searchCollections(...args),
}));

vi.mock('../../core/hooks/useRedux', () => {
  const state = {
    collections: {
      posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' },
    },
    config: { search: true },
  };
  return {
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

import LaikaCollectionSearch from '@/laika-app/LaikaCollectionSearch';

describe('LaikaCollectionSearch', () => {
  it('renders the search input with global placeholder when not on a collection route', () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/']}>
        <LaikaCollectionSearch />
      </MemoryRouter>,
    );
    expect(getByPlaceholderText('collection.sidebar.searchAll')).toBeInTheDocument();
  });

  it('dispatches searchCollections on Enter with the query', () => {
    searchCollections.mockClear();
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/']}>
        <LaikaCollectionSearch />
      </MemoryRouter>,
    );
    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(searchCollections).toHaveBeenCalledWith('hello', '');
  });

  it('ignores Enter when query is empty', () => {
    searchCollections.mockClear();
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/']}>
        <LaikaCollectionSearch />
      </MemoryRouter>,
    );
    const input = getByPlaceholderText('collection.sidebar.searchAll');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(searchCollections).not.toHaveBeenCalled();
  });
});
