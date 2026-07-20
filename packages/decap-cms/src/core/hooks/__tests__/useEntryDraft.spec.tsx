import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntryDraft } from '@/core/hooks/useEntryDraft';
import entryDraftReducer from '@/core/reducers/entryDraft';

import type * as EntriesActions from '@/core/actions/entries';

// `createEmptyDraft`/`createDraftDuplicateFromEntry` are real thunks that
// need a live backend + media-library-loaded state — out of scope for this
// hook's own selector/dispatch wiring. `changeDraftField`,
// `changeDraftFieldValidation` and `discardDraft` are plain synchronous
// action creators, so they're left real: driving them through the actual
// `entryDraft` reducer is how we exercise a genuine state-transition path.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    createEmptyDraft: vi.fn((collection: unknown, search: string) => ({
      type: 'test/createEmptyDraft',
      payload: { collection, search },
    })),
    createDraftDuplicateFromEntry: vi.fn((entry: unknown) => ({
      type: 'test/createDraftDuplicateFromEntry',
      payload: { entry },
    })),
  };
});

// eslint-disable-next-line import/order
import { createDraftDuplicateFromEntry, createEmptyDraft } from '@/core/actions/entries';

function buildStore() {
  return createStore(combineReducers({ entryDraft: entryDraftReducer }), applyMiddleware(thunk));
}

function setup() {
  const store = buildStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result, rerender } = renderHook(() => useEntryDraft(), { wrapper });
  return { store, result, rerender };
}

describe('useEntryDraft', () => {
  beforeEach(() => {
    vi.mocked(createEmptyDraft).mockClear();
    vi.mocked(createDraftDuplicateFromEntry).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the documented shape for a fresh (empty) draft', () => {
    const { result } = setup();

    expect(result.current.hasChanged).toBe(false);
    expect(result.current.draftEntry).toEqual({});
    expect(result.current.fieldsMetaData).toEqual({});
    expect(result.current.fieldsErrors).toEqual({});
    expect(result.current.localBackup).toBeUndefined();
    expect(result.current.draftKey).toBe('');
    expect(result.current.isPersisting).toBeUndefined();
    expect(result.current.isNewRecord).toBeUndefined();
    expect(result.current.isModification).toBeUndefined();
    expect(typeof result.current.createEmpty).toBe('function');
    expect(typeof result.current.createDuplicate).toBe('function');
    expect(typeof result.current.discard).toBe('function');
    expect(typeof result.current.changeField).toBe('function');
    expect(typeof result.current.validateField).toBe('function');
  });

  it('changeField() on a fresh entry flips hasChanged and writes the field into draftEntry.data (state-transition)', () => {
    const { store, result, rerender } = setup();

    act(() => {
      store.dispatch({ type: 'DRAFT_CREATE_EMPTY', payload: { data: {} } } as any);
    });
    rerender();
    expect(result.current.hasChanged).toBe(false);
    expect(result.current.isNewRecord).toBe(true);

    act(() => {
      result.current.changeField({
        field: { name: 'title' } as any,
        value: 'hello',
        metadata: {},
        entries: [],
      });
    });
    rerender();

    expect(result.current.hasChanged).toBe(true);
    expect((result.current.draftEntry as any).data.title).toBe('hello');
  });

  it('discard() resets the draft back to its initial (unchanged) state', () => {
    const { store, result, rerender } = setup();

    act(() => {
      store.dispatch({ type: 'DRAFT_CREATE_EMPTY', payload: { data: {} } } as any);
    });
    act(() => {
      result.current.changeField({
        field: { name: 'title' } as any,
        value: 'hello',
        metadata: {},
        entries: [],
      });
    });
    rerender();
    expect(result.current.hasChanged).toBe(true);

    act(() => {
      result.current.discard();
    });
    rerender();

    expect(result.current.hasChanged).toBe(false);
    expect(result.current.draftEntry).toEqual({});
    expect(result.current.draftKey).toBe('');
  });

  it('validateField() records field errors under fieldsErrors', () => {
    const { result, rerender } = setup();

    act(() => {
      result.current.validateField('title', [{ type: 'required', parentIds: [], message: 'Required' }]);
    });
    rerender();

    expect(result.current.fieldsErrors).toEqual({
      title: [{ type: 'required', parentIds: [], message: 'Required' }],
    });

    act(() => {
      result.current.validateField('title', []);
    });
    rerender();

    expect(result.current.fieldsErrors).toEqual({});
  });

  it('createEmpty() dispatches createEmptyDraft(collection, search)', () => {
    const { result } = setup();
    const collection = { name: 'posts' } as any;

    act(() => {
      result.current.createEmpty(collection, '?title=hi');
    });

    expect(createEmptyDraft).toHaveBeenCalledTimes(1);
    expect(createEmptyDraft).toHaveBeenCalledWith(collection, '?title=hi');
  });

  it('createDuplicate() dispatches createDraftDuplicateFromEntry(entry)', () => {
    const { result } = setup();
    const entry = { slug: 'my-post' } as any;

    act(() => {
      result.current.createDuplicate(entry);
    });

    expect(createDraftDuplicateFromEntry).toHaveBeenCalledTimes(1);
    expect(createDraftDuplicateFromEntry).toHaveBeenCalledWith(entry);
  });
});
