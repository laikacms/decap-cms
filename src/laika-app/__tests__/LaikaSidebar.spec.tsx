import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-polyglot', () => ({
  translate: () => (Component: React.ComponentType<any>) => {
    return function Translated(props: any) {
      return <Component {...props} t={(key: string) => key} />;
    };
  },
}));

vi.mock('../../core/hooks/useRedux', () => {
  const state = {
    collections: {
      posts: {
        name: 'posts',
        label: 'Posts',
        type: 'folder_based_collection',
      },
      meta: {
        name: 'meta',
        label: 'Meta',
        type: 'file_based_collection',
        files: [{ name: 'a' }, { name: 'b' }],
      },
    },
    config: { search: true },
  };
  return {
    useAppDispatch: () => () => undefined,
    useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

vi.mock('../../core/actions/collections', () => ({
  searchCollections: vi.fn(),
}));

import LaikaSidebar from '../LaikaSidebar';

describe('LaikaSidebar', () => {
  it('renders a link for every visible collection plus an App settings link', () => {
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <LaikaSidebar
          collections={{
            posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
            meta: {
              name: 'meta',
              label: 'Meta',
              type: 'file_based_collection',
              files: [{ name: 'a' }, { name: 'b' }],
            } as any,
          }}
        />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('Meta')).toBeInTheDocument();
    expect(getByText('App settings')).toBeInTheDocument();
    const links = getByText('App settings').closest('a') as HTMLAnchorElement | null;
    expect(links?.getAttribute('href')).toBe('/settings');
  });

  it('keeps the built-in app link distinct from a collection labeled "Settings"', () => {
    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <LaikaSidebar
          collections={{
            settings: {
              name: 'settings',
              label: 'Settings',
              type: 'file_based_collection',
              files: [{ name: 'general' }, { name: 'authors' }],
            } as any,
          }}
        />
      </MemoryRouter>,
    );
    // The CMS collection keeps its user-defined "Settings" label, and it is
    // the only element with that exact text — the app link no longer collides.
    const collectionLabels = getAllByText('Settings');
    expect(collectionLabels).toHaveLength(1);
    const collectionLink = collectionLabels[0].closest('a') as HTMLAnchorElement | null;
    expect(collectionLink?.getAttribute('href')).toBe('/collections/settings');

    // The built-in app link renders with an unambiguous label instead.
    const appSettingsLink = getByText('App settings').closest('a') as HTMLAnchorElement | null;
    expect(appSettingsLink?.getAttribute('href')).toBe('/settings');
  });

  it('shows a file-count badge for file-based collections', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaSidebar
          collections={{
            meta: {
              name: 'meta',
              label: 'Meta',
              type: 'file_based_collection',
              files: [{ name: 'a' }, { name: 'b' }],
            } as any,
          }}
        />
      </MemoryRouter>,
    );
    expect(getByText('2')).toBeInTheDocument();
  });

  it('hides collections with hide=true', () => {
    const { queryByText, getByText } = render(
      <MemoryRouter>
        <LaikaSidebar
          collections={{
            posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
            hidden: {
              name: 'hidden',
              label: 'Hidden',
              type: 'folder_based_collection',
              hide: true,
            } as any,
          }}
        />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(queryByText('Hidden')).toBeNull();
  });
});
