import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntry } from '@/core/hooks/useEntry';
import { setActiveRouting } from '@/core/routing/registry';
import { defaultRoutingTable } from '@/core/routing/router';

import type * as EditorialWorkflowActions from '@/core/actions/editorialWorkflow';
import type * as EntriesActions from '@/core/actions/entries';
import type { Router } from '@/core/routing/router';
import type { AnyAction } from 'redux';

// Thunks that hit a live backend are replaced by controllable stand-ins;
// the hook's own selector wiring, dispatch plumbing and navigation run for real.
vi.mock('@/core/actions/entries', async importOriginal => {
  const actual = await importOriginal<typeof EntriesActions>();
  return {
    ...actual,
    persistEntry: vi.fn(),
    deleteEntry: vi.fn(),
  };
});
vi.mock('@/core/actions/editorialWorkflow', async importOriginal => {
  const actual = await importOriginal<typeof EditorialWorkflowActions>();
  return {
    ...actual,
    updateUnpublishedEntryStatus: vi.fn(
      (collection: string, slug: string, oldStatus: string, newStatus: string) => ({
        type: 'test/updateStatus',
        payload: { collection, slug, oldStatus, newStatus },
      }),
    ),
    unpublishPublishedEntry: vi.fn(),
  };
});

// eslint-disable-next-line import/order
import { deleteEntry, persistEntry } from '@/core/actions/entries';
// eslint-disable-next-line import/order
import { unpublishPublishedEntry, updateUnpublishedEntryStatus } from '@/core/actions/editorialWorkflow';

const collection = {
  name: 'posts',
  type: 'folder_based_collection',
  folder: 'content/posts',
  fields: [{ name: 'title', widget: 'string' }],
};

const publishedEntry = { slug: 'hello', collection: 'posts', data: { title: 'Hello' } };
const workflowEntry = { slug: 'hello', collection: 'posts', status: 'draft' };

type Preloaded = { entities?: Record<string, unknown>, workflow?: Record<string, unknown> };

let dispatched: AnyAction[] = [];

const router: Router = {
  location: () => ({ pathname: '/', search: '' }),
  push: vi.fn(),
  replace: vi.fn(),
  href: (path: string) => `#${path}`,
  subscribe: () => () => {},
};

function setup(
  options: { slug?: string, newEntry?: boolean } = { slug: 'hello' },
  preloaded: Preloaded = {},
) {
  const state = {
    collections: { posts: collection },
    entries: { entities: preloaded.entities ?? {}, pages: {} },
    config: {},
    editorialWorkflow: { entities: preloaded.workflow ?? {} },
    deploys: {},
  };
  const recorder = () => (next: (a: AnyAction) => unknown) => (action: AnyAction) => {
    if (action && typeof action === 'object') {
      dispatched.push(action);
    }
    return next(action);
  };
  const store = createStore((s: typeof state = state) => s, state, applyMiddleware(recorder, thunk));
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useEntry({ collectionName: 'posts', ...options }), { wrapper });
  return { store, result };
}

describe('useEntry', () => {
  beforeEach(() => {
    dispatched = [];
    vi.mocked(router.push).mockClear();
    vi.mocked(router.replace).mockClear();
    vi.mocked(persistEntry).mockReset();
    vi.mocked(deleteEntry).mockReset();
    vi.mocked(unpublishPublishedEntry).mockReset();
    vi.mocked(updateUnpublishedEntryStatus).mockClear();
    setActiveRouting({ router, routing: defaultRoutingTable });
  });

  describe('entry state', () => {
    it('newEntry: entry is null, isNewEntry true, isPublished false', () => {
      const { result } = setup(
        { newEntry: true },
        { entities: { 'posts.hello': publishedEntry } },
      );

      expect(result.current.entry).toBeNull();
      expect(result.current.isNewEntry).toBe(true);
      expect(result.current.isPublished).toBe(false);
      expect(result.current.collection).toBe(collection);
      expect(result.current.fields).toEqual(collection.fields);
    });

    it('published entry: entry resolved from store, isPublished true, no currentStatus', () => {
      const { result } = setup(
        { slug: 'hello' },
        { entities: { 'posts.hello': publishedEntry } },
      );

      expect(result.current.entry).toBe(publishedEntry);
      expect(result.current.isNewEntry).toBe(false);
      expect(result.current.isPublished).toBe(true);
      expect(result.current.unpublishedEntry).toBeUndefined();
      expect(result.current.currentStatus).toBeUndefined();
    });

    it('unpublished entry: isPublished false and currentStatus mirrors the workflow status', () => {
      const { result } = setup(
        { slug: 'hello' },
        { entities: { 'posts.hello': publishedEntry }, workflow: { 'posts.hello': workflowEntry } },
      );

      expect(result.current.unpublishedEntry).toBe(workflowEntry);
      expect(result.current.isPublished).toBe(false);
      expect(result.current.isNewEntry).toBe(false);
      expect(result.current.currentStatus).toBe('draft');
    });
  });

  describe('updateStatus', () => {
    it('dispatches for a valid status name with the current and new status', () => {
      const { result } = setup({ slug: 'hello' }, { workflow: { 'posts.hello': workflowEntry } });

      act(() => result.current.updateStatus('PENDING_REVIEW'));

      expect(updateUnpublishedEntryStatus).toHaveBeenCalledWith(
        'posts',
        'hello',
        'draft',
        'pending_review',
      );
      expect(dispatched).toEqual([
        {
          type: 'test/updateStatus',
          payload: { collection: 'posts', slug: 'hello', oldStatus: 'draft', newStatus: 'pending_review' },
        },
      ]);
    });

    it('dispatches nothing for an unknown status name', () => {
      const { result } = setup({ slug: 'hello' }, { workflow: { 'posts.hello': workflowEntry } });

      act(() => result.current.updateStatus('NOT_A_STATUS'));

      expect(updateUnpublishedEntryStatus).not.toHaveBeenCalled();
      expect(dispatched).toEqual([]);
    });

    it('dispatches nothing when there is no currentStatus', () => {
      const { result } = setup({ slug: 'hello' });

      act(() => result.current.updateStatus('PENDING_REVIEW'));

      expect(updateUnpublishedEntryStatus).not.toHaveBeenCalled();
      expect(dispatched).toEqual([]);
    });
  });

  describe('remove / unpublish navigation', () => {
    function deferred() {
      let resolve!: () => void;
      const promise = new Promise<void>(res => {
        resolve = res;
      });
      return { promise, resolve };
    }

    it('remove navigates to the collection only after the dispatch resolves', async () => {
      const gate = deferred();
      vi.mocked(deleteEntry).mockReturnValue((() => gate.promise) as never);
      const { result } = setup({ slug: 'hello' });

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.remove();
      });
      expect(deleteEntry).toHaveBeenCalledWith(collection, 'hello');
      expect(router.push).not.toHaveBeenCalled();

      await act(async () => {
        gate.resolve();
        await pending;
      });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(
        defaultRoutingTable.collection.create({ collectionName: 'posts' }),
      );
    });

    it('unpublish navigates to the collection only after the dispatch resolves', async () => {
      const gate = deferred();
      vi.mocked(unpublishPublishedEntry).mockReturnValue((() => gate.promise) as never);
      const { result } = setup({ slug: 'hello' });

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.unpublish();
      });
      expect(unpublishPublishedEntry).toHaveBeenCalledWith(collection, 'hello');
      expect(router.push).not.toHaveBeenCalled();

      await act(async () => {
        gate.resolve();
        await pending;
      });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith(
        defaultRoutingTable.collection.create({ collectionName: 'posts' }),
      );
    });
  });

  describe('persist', () => {
    it('dispatches persistEntry with the collection', async () => {
      vi.mocked(persistEntry).mockReturnValue((() => Promise.resolve()) as never);
      const { result } = setup({ slug: 'hello' });

      await act(async () => {
        await result.current.persist();
      });

      expect(persistEntry).toHaveBeenCalledWith(collection);
    });

    it('does not throw when the dispatch rejects', async () => {
      vi.mocked(persistEntry).mockReturnValue((() => Promise.reject(new Error('invalid'))) as never);
      const { result } = setup({ slug: 'hello' });

      await act(async () => {
        await expect(result.current.persist()).resolves.toBeUndefined();
      });

      expect(persistEntry).toHaveBeenCalledTimes(1);
    });
  });
});
