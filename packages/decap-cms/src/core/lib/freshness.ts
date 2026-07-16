import { loadUnpublishedEntries } from '@/core/actions/editorialWorkflow';
import { loadEntries } from '@/core/actions/entries';
import { currentBackend } from '@/core/backend';
import { EDITORIAL_WORKFLOW } from '@/core/constants/publishModes';
import { selectEntriesLoaded } from '@/core/reducers/entries';
import queryCore, { collectionTag, MEDIA_TAG, UNPUBLISHED_TAG } from '@/lib/util/queryCore';

import type { Backend } from '@/core/backend';

type State = any;
type Dispatch = (action: any) => any;

export interface FreshnessControllerOptions {
  getState: () => State;
  dispatch: Dispatch;
  /** Poll interval while the tab is visible. */
  intervalMs?: number;
  /** Injectable for tests; defaults to the session backend. */
  getBackend?: (state: State) => Backend;
}

const DEFAULT_INTERVAL = 30_000;

/**
 * Background change detection ("multiplayer-lite"). For backends that expose a
 * sync token, polls it while the tab is visible (plus on window focus). When the
 * token changes, the change feed (or a coarse fallback) decides which collections
 * are stale; those already loaded in the store are refreshed so other people's
 * edits appear without a reload. The open editor draft is never touched.
 */
export function createFreshnessController(options: FreshnessControllerOptions) {
  const { getState, dispatch, intervalMs = DEFAULT_INTERVAL } = options;
  const getBackend = options.getBackend ?? (state => currentBackend(state.config));

  let timer: ReturnType<typeof setInterval> | null = null;
  let lastToken: string | null = null;
  let ticking = false;
  let unsupported = false;

  async function tick() {
    if (ticking || unsupported) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const state = getState();
    if (!state?.auth?.user || !state.config) return;

    let backend: Backend;
    try {
      backend = getBackend(state);
    } catch {
      return;
    }
    if (!backend.supportsContentSync()) {
      unsupported = true;
      stop();
      return;
    }

    ticking = true;
    try {
      const token = await backend.getSyncToken();
      if (!token || token === lastToken) return;

      if (lastToken === null) {
        // First observation is the baseline; nothing to compare against.
        lastToken = token;
        return;
      }

      const since = lastToken;
      lastToken = token;
      await onContentChanged(backend, state, since);
    } catch (err) {
      console.error('Content sync poll failed:', err);
    } finally {
      ticking = false;
    }
  }

  async function onContentChanged(backend: Backend, state: State, since: string) {
    let affected: Set<string> | null = null;
    let sawUnmatchedPath = true;

    if (backend.supportsChangeFeed()) {
      const feed = await backend.getChanges(since);
      if (feed) {
        lastToken = feed.token;
        const paths = feed.changes.map(change => change.path);
        const match = matchCollectionsByPath(state.collections, paths);
        affected = match.collections;
        sawUnmatchedPath = match.unmatched;
      }
    }

    // Re-read state after the awaits above; loaded flags may have moved.
    const freshState = getState();
    const collections: Record<string, any> = freshState.collections ?? state.collections ?? {};
    const staleNames = affected ?? new Set(Object.keys(collections));

    for (const name of staleNames) {
      queryCore.invalidateTags([collectionTag(name)]);
    }
    if (sawUnmatchedPath) {
      queryCore.invalidateTags([MEDIA_TAG]);
    }
    queryCore.invalidateTags([UNPUBLISHED_TAG]);

    // Refresh only what the session has already loaded; untouched collections
    // stay unfetched until something renders them.
    for (const name of staleNames) {
      const collection = collections[name];
      if (collection && selectEntriesLoaded(freshState.entries, name)) {
        dispatch(loadEntries(collection));
      }
    }
    if (
      freshState.config.publish_mode === EDITORIAL_WORKFLOW
      && freshState.editorialWorkflow?.pages?.ids
    ) {
      dispatch(loadUnpublishedEntries(collections as any));
    }
  }

  function onFocus() {
    void tick();
  }

  function start() {
    if (timer !== null || unsupported) return;
    timer = setInterval(() => void tick(), intervalMs);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onFocus);
    }
    void tick();
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    }
  }

  return { start, stop, tick };
}

/**
 * Maps changed content paths onto collection names. Folder collections match by
 * path prefix; files collections match exact file paths. `unmatched` reports
 * whether any path belonged to no collection (media, config, ...).
 */
export function matchCollectionsByPath(
  collections: Record<string, any> | undefined,
  paths: string[],
): { collections: Set<string>, unmatched: boolean } {
  const matched = new Set<string>();
  let unmatched = false;

  for (const rawPath of paths) {
    const path = rawPath.replace(/^\/+/, '');
    let found = false;
    for (const [name, collection] of Object.entries(collections ?? {})) {
      if (collection.folder) {
        const folder = String(collection.folder).replace(/^\/+|\/+$/g, '');
        if (path === folder || path.startsWith(`${folder}/`)) {
          matched.add(name);
          found = true;
        }
      } else if (Array.isArray(collection.files)) {
        if (collection.files.some((file: any) => file?.file === path)) {
          matched.add(name);
          found = true;
        }
      }
    }
    if (!found) unmatched = true;
  }

  return { collections: matched, unmatched };
}
