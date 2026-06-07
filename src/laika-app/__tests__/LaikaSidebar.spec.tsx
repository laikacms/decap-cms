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
  it('renders a link for every visible collection plus a Settings link', () => {
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <LaikaSidebar collections={{
          posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
          meta: { name: 'meta', label: 'Meta', type: 'file_based_collection', files: [{ name: 'a' }, { name: 'b' }] } as any,
        }} />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(getByText('Meta')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
    const links = (getByText('Settings').closest('a') as HTMLAnchorElement | null);
    expect(links?.getAttribute('href')).toBe('/settings');
  });

  it('shows a file-count badge for file-based collections', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaSidebar collections={{
          meta: { name: 'meta', label: 'Meta', type: 'file_based_collection', files: [{ name: 'a' }, { name: 'b' }] } as any,
        }} />
      </MemoryRouter>,
    );
    expect(getByText('2')).toBeInTheDocument();
  });

  it('hides collections with hide=true', () => {
    const { queryByText, getByText } = render(
      <MemoryRouter>
        <LaikaSidebar collections={{
          posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
          hidden: { name: 'hidden', label: 'Hidden', type: 'folder_based_collection', hide: true } as any,
        }} />
      </MemoryRouter>,
    );
    expect(getByText('Posts')).toBeInTheDocument();
    expect(queryByText('Hidden')).toBeNull();
  });
});
