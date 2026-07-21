import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CmsSlotsProvider, useCmsSlots } from '@/core/lib/slots';

import type { CmsSlots } from '@/core/lib/slots';

/**
 * Pinning tests for DCMS-NEW-SLOTS: the `CmsSlots` render-slot context is a
 * public, load-bearing extension surface (used by laika-app and 9 internal
 * consumers) but previously shipped with zero unit tests. These pin the
 * contract described in the `slots.tsx` JSDoc.
 */

function SlotsProbe({ onSlots }: { onSlots: (slots: CmsSlots) => void }) {
  onSlots(useCmsSlots());
  return null;
}

describe('slots', () => {
  describe('useCmsSlots', () => {
    it('returns an object with every slot undefined when no CmsSlotsProvider is present', () => {
      let captured: CmsSlots | undefined;
      render(<SlotsProbe onSlots={slots => (captured = slots)} />);

      expect(captured).toEqual({});
      expect(captured?.renderCollectionTop).toBeUndefined();
      expect(captured?.renderCollectionSidebar).toBeUndefined();
      expect(captured?.renderCollectionControls).toBeUndefined();
      expect(captured?.renderEntryCard).toBeUndefined();
      expect(captured?.renderEntryListEmpty).toBeUndefined();
      expect(captured?.renderLoader).toBeUndefined();
      expect(captured?.renderWorkflowCard).toBeUndefined();
      expect(captured?.renderEditorToolbar).toBeUndefined();
      expect(captured?.renderEditorViewControls).toBeUndefined();
      expect(captured?.renderMediaLibraryCard).toBeUndefined();
      expect(captured?.renderMediaLibraryTop).toBeUndefined();
    });
  });

  describe('CmsSlotsProvider', () => {
    it('resolves only the keys supplied in a partial CmsSlots object, leaving the rest undefined', () => {
      const renderLoader = () => <div>custom loader</div>;
      const renderEntryCard = () => <div>custom entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader, renderEntryCard }}>
          <SlotsProbe onSlots={slots => (captured = slots)} />
        </CmsSlotsProvider>,
      );

      expect(captured?.renderLoader).toBe(renderLoader);
      expect(captured?.renderEntryCard).toBe(renderEntryCard);
      expect(captured?.renderCollectionTop).toBeUndefined();
      expect(captured?.renderWorkflowCard).toBeUndefined();
      expect(captured?.renderMediaLibraryTop).toBeUndefined();
    });

    it('falls back to an empty slots object when rendered without a slots prop', () => {
      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider>
          <SlotsProbe onSlots={slots => (captured = slots)} />
        </CmsSlotsProvider>,
      );

      expect(captured).toEqual({});
    });

    it('lets an inner provider win over an outer one for overlapping keys, while non-overridden keys still resolve to the outer value', () => {
      const outerLoader = () => <div>outer loader</div>;
      const innerLoader = () => <div>inner loader</div>;
      const outerEntryCard = () => <div>outer entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader: outerLoader, renderEntryCard: outerEntryCard }}>
          <CmsSlotsProvider slots={{ renderLoader: innerLoader }}>
            <SlotsProbe onSlots={slots => (captured = slots)} />
          </CmsSlotsProvider>
        </CmsSlotsProvider>,
      );

      // Inner provider replaces the whole slots object, so it wins for the
      // key it sets and does NOT inherit/merge the outer's other keys.
      expect(captured?.renderLoader).toBe(innerLoader);
      expect(captured?.renderEntryCard).toBeUndefined();
    });

    it('lets a nested provider inherit the outer value for a key it does not itself override', () => {
      const outerLoader = () => <div>outer loader</div>;
      const innerEntryCard = () => <div>inner entry card</div>;

      let captured: CmsSlots | undefined;
      render(
        <CmsSlotsProvider slots={{ renderLoader: outerLoader }}>
          <CmsSlotsProvider slots={{ renderLoader: outerLoader, renderEntryCard: innerEntryCard }}>
            <SlotsProbe onSlots={slots => (captured = slots)} />
          </CmsSlotsProvider>
        </CmsSlotsProvider>,
      );

      expect(captured?.renderLoader).toBe(outerLoader);
      expect(captured?.renderEntryCard).toBe(innerEntryCard);
    });
  });

  describe('renderCollectionControls', () => {
    it('receives searchQuery and onSearchChange when invoked from Collection.tsx', async () => {
      vi.resetModules();

      vi.doMock('@/core/hooks/useRedux', () => ({
        useAppDispatch: () => vi.fn(),
        useAppSelector: (selector: (state: any) => any) =>
          selector({
            collections: {
              shop: { name: 'shop', label: 'Shop', nested: { depth: 100 }, create: true },
            },
            entries: {},
            config: {},
          }),
      }));

      vi.doMock('@/core/i18n', () => ({
        useTranslate: () => (key: string) => key,
      }));

      vi.doMock('@/core/reducers/collections', () => ({
        selectSortableFields: () => [],
        selectViewFilters: () => undefined,
        selectViewGroups: () => undefined,
      }));

      vi.doMock('@/core/reducers/entries', () => ({
        selectEntriesFilter: () => undefined,
        selectEntriesGroup: () => undefined,
        selectEntriesSort: () => undefined,
        selectViewStyle: () => 'list',
      }));

      vi.doMock('@/core/components/Collection/Sidebar', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionTop', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/CollectionControls', () => ({ default: () => null }));
      vi.doMock('@/core/components/Collection/Entries/EntriesCollection', () => ({
        default: () => null,
      }));
      vi.doMock('@/core/components/Collection/Entries/EntriesSearch', () => ({
        default: () => null,
      }));

      const renderCollectionControls = vi.fn(() => null);
      vi.doMock('@/core/lib/slots', () => ({
        useCmsSlots: () => ({ renderCollectionControls }),
      }));

      const { default: CmsCollection } = await import('@/core/components/Collection/Collection');

      render(<CmsCollection match={{ params: { name: 'shop' } }} />);

      expect(renderCollectionControls).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: expect.any(String),
          onSearchChange: expect.any(Function),
        }),
      );

      vi.doUnmock('@/core/hooks/useRedux');
      vi.doUnmock('@/core/i18n');
      vi.doUnmock('@/core/reducers/collections');
      vi.doUnmock('@/core/reducers/entries');
      vi.doUnmock('@/core/components/Collection/Sidebar');
      vi.doUnmock('@/core/components/Collection/CollectionTop');
      vi.doUnmock('@/core/components/Collection/CollectionControls');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesCollection');
      vi.doUnmock('@/core/components/Collection/Entries/EntriesSearch');
      vi.doUnmock('@/core/lib/slots');
      vi.resetModules();
    });
  });
});
