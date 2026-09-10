import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { changeDraftField } from '@/core/actions/entries';
import { useEditor } from '@/core/hooks/useEditor';
import { I18n } from '@/core/i18n';
import reducers from '@/core/reducers';
import { RouterProvider } from '@/core/routing/context';

import type * as EntriesActions from '@/core/actions/entries';
import type { Router, RouterUpdate } from '@/core/routing/router';

// `persistLocalBackup` is the thunk `createBackup`'s debounce ultimately
// dispatches -- stub it so we can assert exactly which `(entry, collection)`
// pairs it was called with, without exercising a real backend.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    persistLocalBackup: vi.fn(() => () => {}),
    retrieveLocalBackup: vi.fn(() => () => Promise.resolve()),
    loadEntries: vi.fn(() => () => {}),
    // `setup()` (called below purely to obtain its `cleanup` for the
    // debounce-flush simulation) would otherwise re-dispatch a real
    // `createEmptyDraft`, clobbering the draft this test seeds by hand and
    // hitting a real backend resolution it has no config for.
    createEmptyDraft: vi.fn(() => () => {}),
  };
});

// `useEditor` reads `useRouter()` unconditionally, but this test drives the
// collection swap directly through `renderHook`'s `rerender`, not through the
// router -- a minimal stub is enough.
const fakeRouter: Router = {
  location: () => ({ pathname: '/collections/restaurants/new', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: vi.fn((_listener: (update: RouterUpdate) => void) => () => {}),
  block: vi.fn(() => () => {}),
};

function buildStore() {
  return createStore(
    combineReducers(reducers as any),
    {
      config: { publish_mode: 'simple', display_url: '' },
      collections: {
        restaurants: {
          name: 'restaurants',
          label: 'Restaurants',
          fields: [],
          type: 'folder_based_collection',
          folder: '_restaurants',
        },
        kitchenSink: {
          name: 'kitchenSink',
          label: 'Kitchen Sink',
          fields: [],
          type: 'folder_based_collection',
          folder: '_kitchen-sink',
        },
      },
    } as any,
    applyMiddleware(thunk),
  );
}

describe('useEditor local-backup cross-collection leak (DCMS-2270)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('drops a stale draft instead of persisting it under the newly-navigated-to collection\'s backup key', async () => {
    // Fake timers from the start: the debounced backup is scheduled with
    // `setTimeout` under the hood (lodash `debounce`), and swapping timer
    // implementations mid-flight would orphan an already-scheduled real
    // timer instead of letting `advanceTimersByTime` flush it.
    vi.useFakeTimers();

    const { persistLocalBackup } = await import('@/core/actions/entries');

    const store = buildStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>
        <RouterProvider router={fakeRouter}>
          <I18n locale="en" messages={{}}>{children}</I18n>
        </RouterProvider>
      </Provider>
    );

    const { result, rerender } = renderHook(
      ({ collectionName, newEntry }: { collectionName: string, newEntry: boolean }) =>
        useEditor({
          collectionName,
          newEntry,
          locationSearch: '',
          locationPathname: `/collections/${collectionName}/new`,
        }),
      { wrapper, initialProps: { collectionName: 'restaurants', newEntry: true } },
    );

    // Seed a fresh new-entry draft for `restaurants`, the same shape
    // `createEmptyDraft` would leave behind.
    act(() => {
      store.dispatch({ type: 'DRAFT_CREATE_EMPTY', payload: { data: {} } } as any);
    });
    rerender({ collectionName: 'restaurants', newEntry: true });

    // Type into the title field -- flips `hasChanged` and is what queues the
    // debounced backup in the real app (`handleBackupOnChange`'s effect in
    // `Editor.tsx` fires on every `entryDraft`/`collection` change).
    act(() => {
      store.dispatch(
        changeDraftField({
          field: { name: 'title' } as any,
          value: 'LEAK-TEST-restaurant-title',
          metadata: {},
          entries: [],
        }) as any,
      );
    });
    rerender({ collectionName: 'restaurants', newEntry: true });
    expect(result.current.hasChanged).toBe(true);

    // Mirrors `Editor.tsx`'s mount effect (`useEffect(() => { const result =
    // setup(); return result.cleanup; }, [editKey])`): capture the cleanup so
    // we can invoke it below at the same point the real editKey-keyed effect
    // would, on navigating away.
    let cleanup = () => {};
    act(() => {
      ({ cleanup } = result.current.setup());
    });

    act(() => {
      result.current.handleBackupOnChange();
    });

    // Navigate to `kitchenSink` (props flip) *before* Redux's `entryDraft`
    // has been reset -- the exact transitional render described in the
    // issue, where `collection` already reflects the new route but
    // `entryDraft` is still the old collection's. `Editor.tsx` always
    // re-invokes `handleBackupOnChange` on every render via its
    // `useEffect(() => handleBackupOnChange(), [handleBackupOnChange])`, so
    // simulate that here too, in the same order React would run the two
    // effects: the `editKey`-keyed effect (mount effect index 0, cleanup
    // flushes the *old* collection's pending backup) before the
    // `handleBackupOnChange`-keyed effect (mount effect index 2).
    rerender({ collectionName: 'kitchenSink', newEntry: true });
    expect(result.current.entryDraft?.entry?.data?.title).toBe('LEAK-TEST-restaurant-title');
    expect(result.current.collection?.name).toBe('kitchenSink');

    const staleHandleBackupOnChange = result.current.handleBackupOnChange;

    // Both calls belong to the *same* React commit in the real app --
    // `setup()`'s cleanup (flush + `discardDraft()`) and the
    // `handleBackupOnChange` effect both run as passive effects for this
    // one transitional render, back to back, before React processes any of
    // the dispatches and re-renders. Wrapping them in one `act()` call
    // preserves that: two separate `act()` calls would let Testing Library
    // flush a render in between, letting the draft-collection ref "catch up"
    // to `discardDraft()`'s reset in a way the real single-commit effect
    // flush never allows.
    act(() => {
      cleanup(); // flushes the pending restaurants backup, discards the draft
      staleHandleBackupOnChange();
    });

    // Flush any remaining debounce (2000ms) -- should be a no-op: the
    // mismatched call above must have cancelled rather than rescheduled.
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    const calls = vi.mocked(persistLocalBackup).mock.calls;
    const leakedCall = calls.find(([, coll]) => (coll as any)?.name === 'kitchenSink');
    expect(leakedCall).toBeUndefined();

    const restaurantsCall = calls.find(([, coll]) => (coll as any)?.name === 'restaurants');
    expect(restaurantsCall).toBeDefined();
    expect((restaurantsCall?.[0] as any)?.data?.title).toBe('LEAK-TEST-restaurant-title');
  });
});
