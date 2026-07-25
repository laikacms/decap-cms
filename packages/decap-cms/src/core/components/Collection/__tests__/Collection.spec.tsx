import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('../Sidebar', () => ({ default: () => null }));
vi.mock('../CollectionTop', () => ({ default: () => null }));
vi.mock('../CollectionControls', () => ({ default: () => null }));
vi.mock('../Entries/EntriesCollection', () => ({ default: () => null }));
vi.mock('../Entries/EntriesSearch', () => ({ default: () => null }));

const renderCollectionTop = vi.fn(() => null);
vi.mock('@/core/lib/slots', () => ({
  useCmsSlots: () => ({ renderCollectionTop }),
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
});
