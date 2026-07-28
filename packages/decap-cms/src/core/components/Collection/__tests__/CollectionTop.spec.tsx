import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      // The default uses t('collection.collectionTop.newButton', { collectionLabel })
      // — return an interpolated string so we can assert against it.
      return (
        <Component
          {...props}
          t={(key: string, vars?: { collectionLabel?: string }) => {
            if (key === 'collection.collectionTop.newButton' && vars?.collectionLabel) {
              return 'New ' + vars.collectionLabel;
            }
            return key;
          }}
        />
      );
    };
  },
}));

import CollectionTop from '@/core/components/Collection/CollectionTop';
import { RouterProvider } from '@/core/routing/context';
import { createDefaultRouter } from '@/core/routing/defaultRouter';

describe('CollectionTop', () => {
  const collection = {
    name: 'posts',
    label: 'Posts',
    label_singular: 'Post',
    description: 'Blog posts',
    type: 'folder_based_collection',
  } as any;

  function renderCollectionTop(props: Partial<React.ComponentProps<typeof CollectionTop>> = {}) {
    return render(
      <RouterProvider router={createDefaultRouter()}>
        <CollectionTop collection={collection} {...props} />
      </RouterProvider>,
    );
  }

  it('renders the collection heading + description', () => {
    const { getByRole, getByText } = renderCollectionTop();
    expect(getByRole('heading', { level: 1 }).textContent).toBe('Posts');
    expect(getByText('Blog posts')).toBeInTheDocument();
  });

  it('exposes the create-entry link with an accessible name of "New <label_singular>"', () => {
    // Regression test for DCMS-1539: the button previously carried an
    // aria-label ("Create entry of type Post") that fully overrode the
    // visible "New Post" text, breaking `getByRole('link', { name: /New Post/i })`
    // lookups used throughout the e2e suite.
    const { getByRole } = renderCollectionTop({ newEntryUrl: '/collections/posts/new' });
    const link = getByRole('link', { name: /New Post/i });
    expect(link).toHaveAttribute('href', '#/collections/posts/new');
    expect(link).not.toHaveAttribute('aria-label');
  });

  it('omits the new-entry link when newEntryUrl is undefined', () => {
    const { queryByRole } = renderCollectionTop();
    expect(queryByRole('link', { name: /New Post/i })).toBeNull();
  });
});
