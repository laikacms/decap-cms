import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/hooks/useRedux', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (selector: (state: any) => any) =>
    selector({
      collections: {
        shop: {
          name: 'shop',
          label: 'Shop',
          nested: { depth: 100 },
          create: true,
          edit_scopes: ['content:write'],
        },
      },
      entries: {},
      config: {},
      auth: { user: { scopes: ['content:read'] } },
    }),
}));

vi.mock('@/core/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

vi.mock('@/core/reducers/collections', () => ({
  selectSortableFields: () => [],
  selectViewFilters: () => undefined,
  selectViewGroups: () => undefined,
}));

vi.mock('@/core/reducers/entries', () => ({
  selectEntriesFilter: () => undefined,
  selectEntriesGroup: () => undefined,
  selectEntriesSort: () => undefined,
  selectViewStyle: () => 'list',
}));

vi.mock('../Sidebar', () => ({ default: () => <aside data-testid="default-sidebar" /> }));
vi.mock('../CollectionTop', () => ({ default: () => null }));
vi.mock('../CollectionControls', () => ({ default: () => null }));
vi.mock('../Entries/EntriesCollection', () => ({ default: () => null }));
vi.mock('../Entries/EntriesSearch', () => ({ default: () => null }));

const renderCollectionTop = vi.fn(() => null);
let renderCollectionSidebar: (() => React.ReactNode) | undefined;
vi.mock('@/core/lib/slots', () => ({
  useCmsSlots: () => ({ renderCollectionTop, renderCollectionSidebar }),
}));

import CmsCollection from '@/core/components/Collection/Collection';

describe('Collection', () => {
  it('passes the nested-tree filterTerm to the renderCollectionTop slot', () => {
    render(
      <CmsCollection match={{ params: { name: 'shop', filterTerm: 'categories/shoes' } }} />,
    );
    expect(renderCollectionTop).toHaveBeenCalledWith(
      expect.objectContaining({ filterTerm: 'categories/shoes' }),
    );
  });

  it('hides the create URL when the user lacks the collection edit scope', () => {
    render(
      <CmsCollection match={{ params: { name: 'shop' } }} />,
    );

    expect(renderCollectionTop).toHaveBeenCalledWith(
      expect.objectContaining({ newEntryUrl: '' }),
    );
  });

  describe('renderCollectionSidebar layout', () => {
    const mainPaddingLeft = (container: HTMLElement) => {
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
      return getComputedStyle(main as HTMLElement).paddingLeft;
    };

    afterEach(() => {
      renderCollectionSidebar = undefined;
    });

    it('drops the main pane padding-left and the default sidebar when the slot returns null', () => {
      renderCollectionSidebar = () => null;
      const { container } = render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(mainPaddingLeft(container)).toBe('0px');
      expect(screen.queryByTestId('default-sidebar')).toBeNull();
    });

    it('keeps the 280px gutter when the slot returns a node', () => {
      renderCollectionSidebar = () => <aside data-testid="custom-sidebar" />;
      const { container } = render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(mainPaddingLeft(container)).toBe('280px');
      expect(screen.getByTestId('custom-sidebar')).toBeTruthy();
      expect(screen.queryByTestId('default-sidebar')).toBeNull();
    });

    it('falls back to the default sidebar with a 280px gutter when the slot is omitted', () => {
      const { container } = render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(mainPaddingLeft(container)).toBe('280px');
      expect(screen.getByTestId('default-sidebar')).toBeTruthy();
    });
  });
});
