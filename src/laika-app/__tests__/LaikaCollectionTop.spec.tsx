import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

import LaikaCollectionTop from '@/laika-app/LaikaCollectionTop';

describe('LaikaCollectionTop', () => {
  const collection = {
    name: 'posts',
    label: 'Posts',
    label_singular: 'Post',
    description: 'Blog posts',
    type: 'folder_based_collection',
  } as any;

  it('renders breadcrumb with dashboard link + collection label', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaCollectionTop collection={collection} />
      </MemoryRouter>,
    );
    const crumb = getByText('Dashboard');
    expect(crumb.tagName).toBe('A');
    expect(crumb.getAttribute('href')).toBe('/');
  });

  it('renders the collection heading + description', () => {
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <LaikaCollectionTop collection={collection} />
      </MemoryRouter>,
    );
    // "Posts" appears twice — in the breadcrumb and in the heading. Pin
    // the heading via role to avoid ambiguity.
    expect(getByRole('heading', { level: 1 }).textContent).toBe('Posts');
    expect(getByText('Blog posts')).toBeInTheDocument();
  });

  it('renders the "New <label_singular>" button when newEntryUrl is set', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaCollectionTop collection={collection} newEntryUrl="/collections/posts/new" />
      </MemoryRouter>,
    );
    const btn = getByText('New Post');
    expect(btn.closest('a')?.getAttribute('href')).toBe('/collections/posts/new');
  });

  it('omits the new-entry button when newEntryUrl is undefined', () => {
    const { queryByText } = render(
      <MemoryRouter>
        <LaikaCollectionTop collection={collection} />
      </MemoryRouter>,
    );
    expect(queryByText('New Post')).toBeNull();
  });
});
