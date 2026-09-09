import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dispatch = vi.fn();

vi.mock('@/core/hooks/useRedux', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (state: any) => any) => selector(fakeState),
}));

const useStore = vi.fn();
vi.mock('react-redux', () => ({
  useStore: () => useStore(),
}));

vi.mock('@/core/actions/search', () => ({
  searchEntries: vi.fn((searchTerm: string, collectionNames: string[], page?: number) => ({
    type: 'MOCK_SEARCH_ENTRIES',
    searchTerm,
    collectionNames,
    page,
  })),
  clearSearch: vi.fn(() => ({ type: 'MOCK_CLEAR_SEARCH' })),
}));

vi.mock('@/core/reducers', () => ({
  selectSearchedEntries: (state: any, collectionNames: string[]) => state.search.entriesByCollections?.(collectionNames),
  selectUnpublishedEntry: (state: any, collectionName: string, slug: string) =>
    state.unpublishedEntries?.[collectionName]?.[slug],
}));

vi.mock('../Entries', () => ({
  default: vi.fn(() => null),
}));

import { clearSearch, searchEntries } from '@/core/actions/search';
import Entries from '@/core/components/Collection/Entries/Entries';
import EntriesSearch from '@/core/components/Collection/Entries/EntriesSearch';

const EntriesMock = Entries as unknown as ReturnType<typeof vi.fn>;

let fakeState: any;

function baseState(overrides: Partial<typeof fakeState> = {}) {
  return {
    search: {
      isFetching: false,
      page: NaN,
      entriesByCollections: () => [],
    },
    unpublishedEntries: {},
    ...overrides,
  };
}

const collections = {
  posts: { name: 'posts', label: 'Posts' },
  pages: { name: 'pages', label: 'Pages' },
} as any;

beforeEach(() => {
  fakeState = baseState();
  useStore.mockReturnValue({ getState: () => fakeState });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('EntriesSearch', () => {
  it('dispatches searchEntries on mount with the search term and collection names', () => {
    render(<EntriesSearch collections={collections} searchTerm="hello" />);

    expect(searchEntries).toHaveBeenCalledWith('hello', ['posts', 'pages']);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'MOCK_SEARCH_ENTRIES',
      searchTerm: 'hello',
      collectionNames: ['posts', 'pages'],
      page: undefined,
    });
  });

  it('re-dispatches searchEntries when the searchTerm changes', () => {
    const { rerender } = render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();
    dispatch.mockClear();

    rerender(<EntriesSearch collections={collections} searchTerm="world" />);

    expect(searchEntries).toHaveBeenCalledTimes(1);
    expect(searchEntries).toHaveBeenCalledWith('world', ['posts', 'pages']);
  });

  it('re-dispatches searchEntries when the collection-name set changes', () => {
    const { rerender } = render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();
    dispatch.mockClear();

    rerender(<EntriesSearch collections={{ posts: collections.posts }} searchTerm="hello" />);

    expect(searchEntries).toHaveBeenCalledTimes(1);
    expect(searchEntries).toHaveBeenCalledWith('hello', ['posts']);
  });

  it('does not re-dispatch searchEntries when neither the searchTerm nor the collection names change', () => {
    const { rerender } = render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();
    dispatch.mockClear();

    // A new object with the same keys should not count as a change: the
    // effect is keyed off the memoized, stringified collection-name set.
    rerender(<EntriesSearch collections={{ ...collections }} searchTerm="hello" />);

    expect(searchEntries).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches clearSearch on unmount', () => {
    const { unmount } = render(<EntriesSearch collections={collections} searchTerm="hello" />);
    dispatch.mockClear();

    unmount();

    expect(clearSearch).toHaveBeenCalledWith();
    expect(dispatch).toHaveBeenCalledWith({ type: 'MOCK_CLEAR_SEARCH' });
  });

  it('re-dispatches searchEntries with page + 1 when handleCursorActions("append_next") fires', () => {
    fakeState = baseState({ search: { isFetching: false, page: 2, entriesByCollections: () => [] } });

    render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();
    dispatch.mockClear();

    const { handleCursorActions } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
    handleCursorActions('append_next');

    expect(searchEntries).toHaveBeenCalledWith('hello', ['posts', 'pages'], 3);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'MOCK_SEARCH_ENTRIES',
      searchTerm: 'hello',
      collectionNames: ['posts', 'pages'],
      page: 3,
    });
  });

  it('ignores cursor actions other than "append_next"', () => {
    render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();
    dispatch.mockClear();

    const { handleCursorActions } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
    handleCursorActions('append_prev');

    expect(searchEntries).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('treats a missing page as 0 when computing the next page', () => {
    fakeState = baseState({ search: { isFetching: false, page: undefined, entriesByCollections: () => [] } });

    render(<EntriesSearch collections={collections} searchTerm="hello" />);
    (searchEntries as unknown as ReturnType<typeof vi.fn>).mockClear();

    const { handleCursorActions } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
    handleCursorActions('append_next');

    expect(searchEntries).toHaveBeenCalledWith('hello', ['posts', 'pages'], 1);
  });

  it('grants only the append_next cursor action when page is a valid number', () => {
    fakeState = baseState({ search: { isFetching: false, page: 2, entriesByCollections: () => [] } });

    render(<EntriesSearch collections={collections} searchTerm="hello" />);

    const { cursor } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
    expect(Array.from(cursor.actions)).toEqual(['append_next']);
  });

  it('grants no cursor actions when page is NaN', () => {
    fakeState = baseState({ search: { isFetching: false, page: NaN, entriesByCollections: () => [] } });

    render(<EntriesSearch collections={collections} searchTerm="hello" />);

    const { cursor } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
    expect(Array.from(cursor.actions)).toEqual([]);
  });

  describe('getWorkflowStatus', () => {
    it("returns the unpublished entry's status when found", () => {
      fakeState = baseState({
        unpublishedEntries: { posts: { 'hello-world': { status: 'draft' } } },
      });

      render(<EntriesSearch collections={collections} searchTerm="hello" />);

      const { getWorkflowStatus } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
      expect(getWorkflowStatus('posts', 'hello-world')).toBe('draft');
    });

    it('returns null when no unpublished entry is found', () => {
      fakeState = baseState({ unpublishedEntries: {} });

      render(<EntriesSearch collections={collections} searchTerm="hello" />);

      const { getWorkflowStatus } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
      expect(getWorkflowStatus('posts', 'missing-slug')).toBeNull();
    });

    it('reads the store directly rather than a subscribed selector', () => {
      render(<EntriesSearch collections={collections} searchTerm="hello" />);

      const { getWorkflowStatus } = EntriesMock.mock.calls.at(-1)?.[0] ?? {};
      useStore.mock.results[0].value.getState = () => baseState({
        unpublishedEntries: { pages: { about: { status: 'pending_review' } } },
      });

      expect(getWorkflowStatus('pages', 'about')).toBe('pending_review');
    });
  });
});
