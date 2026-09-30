import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EntryListing from '@/core/components/Collection/Entries/EntryListing';
import { I18n } from '@/core/i18n';
import { CmsSlotsProvider } from '@/core/lib/slots';
import { CmsSortDirection, Cursor } from '@/lib/util/index';

import type { EntryCardRenderProps } from '@/core/lib/slots';
import type { CmsCollections, CmsCollectionState, CmsEntry, CmsSortObject } from '@/lib/util/index';

const messages = {
  collection: { entries: { unpublishedHeader: 'Unpublished entries' } },
};

function makeEntry(slug: string, extra: Record<string, unknown> = {}): CmsEntry {
  return {
    slug,
    collection: 'posts',
    path: `posts/${slug}.md`,
    data: { title: slug },
    ...extra,
  } as unknown as CmsEntry;
}

function makeCollection(extra: Record<string, unknown> = {}): CmsCollectionState {
  return {
    name: 'posts',
    label: 'Posts',
    folder: 'posts',
    type: 'folder_based_collection',
    fields: [{ name: 'title', widget: 'string' }, { name: 'rank', widget: 'number' }],
    ...extra,
  } as unknown as CmsCollectionState;
}

type Props = Partial<React.ComponentProps<typeof EntryListing>>;

function setup(props: Props) {
  const cards: EntryCardRenderProps[] = [];
  const renderEntryCard = vi.fn((cardProps: EntryCardRenderProps) => {
    cards.push(cardProps);
    return <li data-testid="card">{cardProps.entry.slug}</li>;
  });
  const handleCursorActions = vi.fn();
  const result = render(
    <I18n locale="en" messages={messages}>
      <CmsSlotsProvider slots={{ renderEntryCard }}>
        <EntryListing
          collections={makeCollection()}
          entries={[]}
          cursor={new Cursor()}
          handleCursorActions={handleCursorActions}
          {...props}
        />
      </CmsSlotsProvider>
    </I18n>,
  );
  return { ...result, cards, handleCursorActions };
}

const slugs = (cards: EntryCardRenderProps[]) => cards.map(c => c.entry.slug);

describe('EntryListing (DCMS-2404)', () => {
  describe('unpublished section', () => {
    it('drops unpublished entries whose slug already exists among published entries', () => {
      const { cards } = setup({
        entries: [makeEntry('a'), makeEntry('b')],
        getUnpublishedEntries: () => [makeEntry('b'), makeEntry('c')],
      });

      expect(slugs(cards)).toEqual(['a', 'b', 'c']);
    });

    it('passes the collection name to getUnpublishedEntries and the workflow status per entry', () => {
      const getUnpublishedEntries = vi.fn(() => [makeEntry('c')]);
      const getWorkflowStatus = vi.fn((_: string, slug: string) => `status-${slug}`);
      const { cards } = setup({
        entries: [makeEntry('a')],
        getUnpublishedEntries,
        getWorkflowStatus,
      });

      expect(getUnpublishedEntries).toHaveBeenCalledWith('posts');
      expect(getWorkflowStatus).toHaveBeenCalledWith('posts', 'a');
      expect(cards.map(c => c.workflowStatus)).toEqual(['status-a', 'status-c']);
    });

    it('sorts unpublished entries ascending and descending by sortFields, leaving published order alone', () => {
      const unpublished = [
        makeEntry('u2', { data: { rank: 2 } }),
        makeEntry('u3', { data: { rank: 3 } }),
        makeEntry('u1', { data: { rank: 1 } }),
      ];
      const published = [makeEntry('p9', { data: { rank: 9 } }), makeEntry('p1', { data: { rank: 1 } })];

      const asc: CmsSortObject[] = [{ key: 'rank', direction: CmsSortDirection.Ascending }];
      const ascResult = setup({ entries: published, getUnpublishedEntries: () => unpublished, sortFields: asc });
      expect(slugs(ascResult.cards)).toEqual(['p9', 'p1', 'u1', 'u2', 'u3']);
      ascResult.unmount();

      const desc: CmsSortObject[] = [{ key: 'rank', direction: CmsSortDirection.Descending }];
      const descResult = setup({ entries: published, getUnpublishedEntries: () => unpublished, sortFields: desc });
      expect(slugs(descResult.cards)).toEqual(['p9', 'p1', 'u3', 'u2', 'u1']);
    });

    it('keeps the incoming order when sortFields is empty', () => {
      const { cards } = setup({
        entries: [],
        getUnpublishedEntries: () => [makeEntry('z'), makeEntry('a')],
        sortFields: [],
      });

      expect(slugs(cards)).toEqual(['z', 'a']);
    });

    describe('nested filterTerm', () => {
      const nestedUnpublished = [
        makeEntry('top', { path: 'posts/top.md' }),
        makeEntry('child', { path: 'posts/docs/child.md' }),
        makeEntry('deep', { path: 'posts/docs/sub/deep.md' }),
        makeEntry('other', { path: 'posts/blog/other.md' }),
      ];

      it('with subfolders true (default) keeps only entries exactly one subfolder below the filter folder', () => {
        const { cards } = setup({
          collections: makeCollection({ nested: { depth: 3 } }),
          entries: [],
          filterTerm: 'docs',
          getUnpublishedEntries: () => nestedUnpublished,
        });

        expect(slugs(cards)).toEqual(['deep']);
      });

      it('with subfolders false keeps only files directly inside the filter folder', () => {
        const { cards } = setup({
          collections: makeCollection({ nested: { depth: 3, subfolders: false } }),
          entries: [],
          filterTerm: 'docs',
          getUnpublishedEntries: () => nestedUnpublished,
        });

        expect(slugs(cards)).toEqual(['child']);
      });

      it('drops entries outside the filter folder entirely', () => {
        const { cards } = setup({
          collections: makeCollection({ nested: { depth: 3, subfolders: false } }),
          entries: [],
          filterTerm: 'blog',
          getUnpublishedEntries: () => nestedUnpublished,
        });

        expect(slugs(cards)).toEqual(['other']);
      });

      it('does not filter when filterTerm is empty', () => {
        const { cards } = setup({
          collections: makeCollection({ nested: { depth: 3 } }),
          entries: [],
          filterTerm: '',
          getUnpublishedEntries: () => nestedUnpublished,
        });

        expect(slugs(cards)).toEqual(['top', 'child', 'deep', 'other']);
      });

      it('does not filter when the collection is not nested', () => {
        const { cards } = setup({
          entries: [],
          filterTerm: 'docs',
          getUnpublishedEntries: () => nestedUnpublished,
        });

        expect(slugs(cards)).toEqual(['top', 'child', 'deep', 'other']);
      });
    });
  });

  describe('show* toggles', () => {
    const props = {
      entries: [makeEntry('pub')],
      getUnpublishedEntries: () => [makeEntry('unpub')],
    };

    it('renders both sections by default', () => {
      const { cards, container } = setup(props);

      expect(slugs(cards)).toEqual(['pub', 'unpub']);
      expect(container.querySelectorAll('.CardsGrid')).toHaveLength(2);
    });

    it('showPublishedEntries=false hides published cards and the published grid', () => {
      const { cards, container, getByText } = setup({ ...props, showPublishedEntries: false });

      expect(slugs(cards)).toEqual(['unpub']);
      expect(container.querySelectorAll('.CardsGrid')).toHaveLength(1);
      expect(getByText('Unpublished entries')).toBeTruthy();
    });

    it('showUnpublishedEntries=false hides unpublished cards and the header', () => {
      const { cards, queryByText } = setup({ ...props, showUnpublishedEntries: false });

      expect(slugs(cards)).toEqual(['pub']);
      expect(queryByText('Unpublished entries')).toBeNull();
    });
  });

  describe('unpublished header', () => {
    it('renders when there are unpublished entries', () => {
      const { getByText } = setup({ entries: [], getUnpublishedEntries: () => [makeEntry('u')] });

      expect(getByText('Unpublished entries')).toBeTruthy();
    });

    it.each([
      ['getUnpublishedEntries returns an empty list', () => [] as CmsEntry[]],
      ['every unpublished slug is already published', () => [makeEntry('a')]],
    ])('is absent when %s', (_label, getUnpublishedEntries) => {
      const { queryByText } = setup({ entries: [makeEntry('a')], getUnpublishedEntries });

      expect(queryByText('Unpublished entries')).toBeNull();
    });

    it('is absent when getUnpublishedEntries is not provided', () => {
      const { queryByText } = setup({ entries: [makeEntry('a')] });

      expect(queryByText('Unpublished entries')).toBeNull();
    });
  });

  describe('multi-collection mode', () => {
    const posts = makeCollection();
    const pages = makeCollection({ name: 'pages', label: 'Pages', folder: 'pages' });

    it('passes collectionLabel for each entry when more than one collection is listed', () => {
      const collections = { posts, pages } as unknown as CmsCollections;
      const { cards } = setup({
        collections,
        entries: [makeEntry('p1'), makeEntry('g1', { collection: 'pages' })],
      });

      expect(cards.map(c => [c.entry.slug, c.collectionLabel])).toEqual([
        ['p1', 'Posts'],
        ['g1', 'Pages'],
      ]);
      expect(cards[1].collection).toBe(pages);
    });

    it('suppresses collectionLabel when only one collection is listed', () => {
      const collections = { posts } as unknown as CmsCollections;
      const { cards } = setup({ collections, entries: [makeEntry('p1')] });

      expect(cards).toHaveLength(1);
      expect(cards[0].collectionLabel).toBe(false);
    });

    it('skips entries whose collection is not in the list', () => {
      const collections = { posts, pages } as unknown as CmsCollections;
      const { cards } = setup({
        collections,
        entries: [makeEntry('p1'), makeEntry('x1', { collection: 'ghost' })],
      });

      expect(slugs(cards)).toEqual(['p1']);
    });

    it('never renders an unpublished section', () => {
      const collections = { posts, pages } as unknown as CmsCollections;
      const getUnpublishedEntries = vi.fn(() => [makeEntry('u')]);
      const { cards, queryByText } = setup({ collections, entries: [makeEntry('p1')], getUnpublishedEntries });

      expect(slugs(cards)).toEqual(['p1']);
      expect(queryByText('Unpublished entries')).toBeNull();
    });
  });

  describe('load more', () => {
    let onIntersect: IntersectionObserverCallback | undefined;
    let originalIO: typeof IntersectionObserver;

    beforeEach(() => {
      originalIO = globalThis.IntersectionObserver;
      class FakeIntersectionObserver {
        constructor(callback: IntersectionObserverCallback) {
          onIntersect = callback;
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
        takeRecords = vi.fn(() => []);
      }
      globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
      globalThis.IntersectionObserver = originalIO;
      onIntersect = undefined;
    });

    const intersect = () =>
      onIntersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    it('calls handleCursorActions("append_next") when the trigger enters view and the cursor can append', () => {
      const { handleCursorActions } = setup({
        entries: [makeEntry('a')],
        cursor: new Cursor({ actions: ['append_next'] }),
      });

      expect(onIntersect).toBeDefined();
      intersect();

      expect(handleCursorActions).toHaveBeenCalledTimes(1);
      expect(handleCursorActions).toHaveBeenCalledWith('append_next');
    });

    it('renders no trigger when the cursor lacks append_next', () => {
      const { handleCursorActions } = setup({
        entries: [makeEntry('a')],
        cursor: new Cursor({ actions: ['prev'] }),
      });

      expect(onIntersect).toBeUndefined();
      expect(handleCursorActions).not.toHaveBeenCalled();
    });
  });
});
