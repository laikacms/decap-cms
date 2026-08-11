import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

import CollectionSearch from '@/core/components/Collection/CollectionSearch';

describe('CollectionSearch', () => {
  const collections = {
    posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' },
  } as any;

  function renderSearch(searchTerm: string) {
    return render(
      <CollectionSearch
        searchTerm={searchTerm}
        collections={collections}
        collection={undefined}
        onSubmit={vi.fn()}
      />,
    );
  }

  it('renders the input pre-populated with the initial searchTerm prop (cold boot)', () => {
    const { getByPlaceholderText } = renderSearch('post');
    expect(getByPlaceholderText('collection.sidebar.searchAll')).toHaveValue('post');
  });

  it('rehydrates the input when searchTerm changes after mount (SPA hashchange between search URLs)', () => {
    const { getByPlaceholderText, rerender } = renderSearch('a');
    const input = getByPlaceholderText('collection.sidebar.searchAll');
    expect(input).toHaveValue('a');

    rerender(
      <CollectionSearch
        searchTerm="b"
        collections={collections}
        collection={undefined}
        onSubmit={vi.fn()}
      />,
    );

    expect(input).toHaveValue('b');
  });

  it('clears the input when navigating from a search URL back to the bare collection route', () => {
    const { getByPlaceholderText, rerender } = renderSearch('post');
    const input = getByPlaceholderText('collection.sidebar.searchAll');
    expect(input).toHaveValue('post');

    rerender(
      <CollectionSearch searchTerm="" collections={collections} collection={undefined} onSubmit={vi.fn()} />,
    );

    expect(input).toHaveValue('');
  });
});
