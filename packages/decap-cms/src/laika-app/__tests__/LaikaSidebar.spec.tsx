import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/i18n', () => ({
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

import { LaikaShellProvider, useLaikaShell } from '@/laika-app/LaikaShellContext';
import LaikaSidebar from '@/laika-app/LaikaSidebar';

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

  it('moves focus through sidebar links with ArrowDown/ArrowUp', () => {
    const { getByText } = render(
      <MemoryRouter>
        <LaikaSidebar
          collections={{
            posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
            faqs: { name: 'faqs', label: 'FAQs', type: 'folder_based_collection' } as any,
          }}
        />
      </MemoryRouter>,
    );
    const posts = getByText('Posts').closest('a') as HTMLAnchorElement;
    const faqs = getByText('FAQs').closest('a') as HTMLAnchorElement;
    posts.focus();
    fireEvent.keyDown(posts, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(faqs);
    fireEvent.keyDown(faqs, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(posts);
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
    // the only element with that exact text; the app link no longer collides.
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

  it('hides collections when the user lacks a required view scope', () => {
    const { queryByText, getByText } = render(
      <MemoryRouter>
        <LaikaSidebar
          userScopes={['content:read']}
          collections={{
            posts: {
              name: 'posts',
              label: 'Posts',
              type: 'folder_based_collection',
              view_scopes: ['content:read'],
            } as any,
            private: {
              name: 'private',
              label: 'Private',
              type: 'folder_based_collection',
              view_scopes: ['admin:read'],
            } as any,
          }}
        />
      </MemoryRouter>,
    );

    expect(getByText('Posts')).toBeInTheDocument();
    expect(queryByText('Private')).toBeNull();
  });

  describe('mobile drawer', () => {
    const MOBILE_QUERY = '(max-width: 900px)';

    beforeEach(() => {
      // jsdom has no matchMedia; report the mobile breakpoint as matching so
      // the sidebar takes the Base UI Drawer path.
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
          matches: query === MOBILE_QUERY,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function OpenSidebarOnMount() {
      const { openMobileSidebar } = useLaikaShell();
      React.useEffect(() => {
        openMobileSidebar();
      }, [openMobileSidebar]);
      return null;
    }

    function renderMobileSidebar({ open }: { open: boolean }) {
      return render(
        <MemoryRouter>
          <LaikaShellProvider>
            {open ? <OpenSidebarOnMount /> : null}
            <LaikaSidebar
              collections={{
                posts: { name: 'posts', label: 'Posts', type: 'folder_based_collection' } as any,
              }}
            />
          </LaikaShellProvider>
        </MemoryRouter>,
      );
    }

    it('renders the sidebar as a labelled dialog when open', async () => {
      renderMobileSidebar({ open: true });
      const dialog = await screen.findByRole('dialog', {
        name: 'collection.sidebar.collections',
      });
      expect(dialog).toHaveAttribute('data-mobile-open', 'true');
      expect(within(dialog).getByText('Posts')).toBeInTheDocument();
      expect(within(dialog).getByText('App settings')).toBeInTheDocument();
    });

    it('does not expose a dialog while closed', () => {
      renderMobileSidebar({ open: false });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes when a nav link inside the drawer is clicked', async () => {
      renderMobileSidebar({ open: true });
      const dialog = await screen.findByRole('dialog', {
        name: 'collection.sidebar.collections',
      });
      fireEvent.click(within(dialog).getByText('Posts'));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('closes when Escape is pressed', async () => {
      renderMobileSidebar({ open: true });
      await screen.findByRole('dialog', { name: 'collection.sidebar.collections' });
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });
  });
});
