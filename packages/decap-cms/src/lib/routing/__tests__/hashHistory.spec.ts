import { describe, expect, it, vi } from 'vitest';

import { createHashHistory, createPath, parsePath } from '@/lib/routing/hashHistory';

/**
 * A miniature session-history simulator standing in for `window`. It models
 * exactly what the hash history relies on: an entry stack with per-entry
 * native state, `pushState`/`replaceState`/`go`, and the `popstate` +
 * `hashchange` events a traversal fires (popstate first, like real browsers).
 * `navigateHash` simulates the user editing the URL bar: a new entry with
 * null state (so no `idx`), then both events.
 */
interface FakeEntry {
  url: string;
  state: unknown;
}

function createFakeWindow(initialEntries: FakeEntry[], opts: { deferGo?: boolean } = {}) {
  const listeners: Record<string, ((event?: unknown) => void)[]> = { popstate: [], hashchange: [] };
  let entries = [...initialEntries];
  let cursor = entries.length - 1;
  const pendingGos: number[] = [];

  const hashOf = (url: string) => {
    const i = url.indexOf('#');
    return i === -1 ? '' : url.slice(i);
  };
  const resolve = (url: string) => url.startsWith('#') ? entries[cursor].url.split('#')[0] + url : url;
  const dispatch = (type: string) => [...listeners[type]].forEach(fn => fn());

  /** Perform a queued or immediate traversal: move the cursor, then fire the
   * events a real browser fires for it (popstate first, then hashchange). */
  function commitGo(delta: number) {
    const next = cursor + delta;
    if (next < 0 || next >= entries.length) return;
    cursor = next;
    dispatch('popstate');
    dispatch('hashchange');
  }

  const win = {
    document: { querySelector: () => null },
    addEventListener(type: string, fn: (event?: unknown) => void) {
      listeners[type]?.push(fn);
    },
    removeEventListener(type: string, fn: (event?: unknown) => void) {
      if (listeners[type]) listeners[type] = listeners[type].filter(f => f !== fn);
    },
    location: {
      get href() {
        return entries[cursor].url;
      },
      get hash() {
        return hashOf(entries[cursor].url);
      },
      assign(url: string) {
        entries = entries.slice(0, cursor + 1);
        entries.push({ url: resolve(url), state: null });
        cursor += 1;
      },
    },
    history: {
      get state() {
        return entries[cursor].state;
      },
      pushState(state: unknown, _title: string, url?: string) {
        entries = entries.slice(0, cursor + 1);
        entries.push({ url: url != null ? resolve(url) : entries[cursor].url, state });
        cursor += 1;
      },
      replaceState(state: unknown, _title: string, url?: string) {
        entries[cursor] = {
          url: url != null ? resolve(url) : entries[cursor].url,
          state,
        };
      },
      go(delta: number) {
        if (opts.deferGo) {
          pendingGos.push(delta);
          return;
        }
        commitGo(delta);
      },
    },
    /**
     * Commit the oldest queued traversal (deferGo mode). Real browsers
     * process `history.go` asynchronously; deferring lets a test interleave
     * event dispatch the way Chrome does (the popped entry's hashchange
     * fires before a revert traversal issued from its popstate commits).
     */
    flushGo() {
      const delta = pendingGos.shift();
      if (delta != null) commitGo(delta);
    },
    /** Simulate the user typing a new hash in the URL bar. */
    navigateHash(hash: string) {
      entries = entries.slice(0, cursor + 1);
      entries.push({ url: entries[cursor].url.split('#')[0] + hash, state: null });
      cursor += 1;
      dispatch('popstate');
      dispatch('hashchange');
    },
    /** Test inspection helpers. */
    get entries() {
      return entries;
    },
    get cursor() {
      return cursor;
    },
  };
  return win;
}

function bootedHistory(initialHash = '#/') {
  const win = createFakeWindow([{ url: `https://example.com/${initialHash}`, state: null }]);
  const history = createHashHistory({ window: win as unknown as Window });
  return { win, history };
}

describe('createPath / parsePath', () => {
  it('round-trips pathname, search, and hash', () => {
    const path = '/collections/posts?q=1#frag';
    expect(createPath(parsePath(path))).toBe(path);
  });

  it('defaults a missing pathname to "/"', () => {
    expect(createPath({})).toBe('/');
    expect(createPath(parsePath('?q=1'))).toBe('/?q=1');
  });
});

describe('createHashHistory', () => {
  it('parses the initial location from the hash and adopts the boot entry', () => {
    const { win, history } = bootedHistory('#/collections/posts?q=1');

    expect(history.location.pathname).toBe('/collections/posts');
    expect(history.location.search).toBe('?q=1');
    expect(history.action).toBe('POP');
    // The boot entry is stamped with an idx so back/forward around it works.
    expect((win.entries[0].state as { idx: number }).idx).toBe(0);
  });

  it('push updates the URL and location and notifies listeners with PUSH', () => {
    const { win, history } = bootedHistory();
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    history.push('/collections/posts');

    expect(win.location.hash).toBe('#/collections/posts');
    expect(history.location.pathname).toBe('/collections/posts');
    expect(updates).toEqual(['PUSH /collections/posts']);
  });

  it('accepts an object target (react-router navigator shape)', () => {
    const { win, history } = bootedHistory();

    history.push({ pathname: '/search/foo', search: '?scope=all' });

    expect(win.location.hash).toBe('#/search/foo?scope=all');
    expect(history.location.search).toBe('?scope=all');
  });

  it('replace swaps the current entry and notifies with REPLACE', () => {
    const { win, history } = bootedHistory();
    history.push('/a');
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    history.replace('/b');

    expect(win.entries.length).toBe(2);
    expect(win.location.hash).toBe('#/b');
    expect(updates).toEqual(['REPLACE /b']);
  });

  it('createHref prefixes the path with a hash', () => {
    const { history } = bootedHistory();
    expect(history.createHref('/collections/posts')).toBe('#/collections/posts');
    expect(history.createHref({ pathname: '/a', search: '?b=1' })).toBe('#/a?b=1');
  });

  it('applies unblocked back/forward as POP', () => {
    const { history } = bootedHistory();
    history.push('/a');
    history.push('/b');
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    history.back();
    history.forward();

    expect(updates).toEqual(['POP /a', 'POP /b']);
  });

  it('holds a PUSH while blocked and re-performs it through retry()', () => {
    const { win, history } = bootedHistory();
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    let transition: { retry(): void } | null = null;
    const unblock = history.block(tx => {
      transition = tx;
    });

    history.push('/a');
    expect(win.location.hash).toBe('#/');
    expect(history.location.pathname).toBe('/');
    expect(updates).toEqual([]);

    unblock();
    transition!.retry();
    expect(win.location.hash).toBe('#/a');
    expect(updates).toEqual(['PUSH /a']);
  });

  it('reverts a blocked back-navigation between own entries, then retries it', () => {
    const { win, history } = bootedHistory();
    history.push('/a');
    history.push('/b');

    const transitions: { location: { pathname: string }, retry(): void }[] = [];
    const unblock = history.block(tx => transitions.push(tx));

    win.history.go(-1);

    // The POP was reverted: URL and location still on /b, blocker saw /a.
    expect(win.location.hash).toBe('#/b');
    expect(history.location.pathname).toBe('/b');
    expect(transitions.map(tx => tx.location.pathname)).toEqual(['/a']);

    // Confirming: unblock (as the hooks do), then retry the navigation.
    unblock();
    transitions[0].retry();
    expect(win.location.hash).toBe('#/a');
    expect(history.location.pathname).toBe('/a');
    expect(history.action).toBe('POP');
  });

  it('blocks a POP onto a pre-boot entry it did not create (DCMS-286/DCMS-569)', () => {
    // The app booted on the second entry; the first predates it (no idx).
    const win = createFakeWindow([
      { url: 'https://example.com/#/legacy', state: null },
      { url: 'https://example.com/#/', state: null },
    ]);
    const history = createHashHistory({ window: win as unknown as Window });
    const updates: unknown[] = [];
    history.listen(update => updates.push(update));

    const transitions: { location: { pathname: string }, retry(): void }[] = [];
    history.block(tx => transitions.push(tx));

    win.history.go(-1);

    // Reverted: the URL bar is back on the app's location, nothing applied.
    expect(win.location.hash).toBe('#/');
    expect(history.location.pathname).toBe('/');
    expect(updates).toEqual([]);
    expect(transitions.map(tx => tx.location.pathname)).toEqual(['/legacy']);
  });

  it('retries a blocked foreign-entry POP into the attempted destination', () => {
    const win = createFakeWindow([
      { url: 'https://example.com/#/legacy', state: null },
      { url: 'https://example.com/#/', state: null },
    ]);
    const history = createHashHistory({ window: win as unknown as Window });

    let transition: { retry(): void } | null = null;
    const unblock = history.block(tx => {
      transition = tx;
    });
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    win.history.go(-1);
    unblock();
    transition!.retry();

    expect(win.location.hash).toBe('#/legacy');
    expect(history.location.pathname).toBe('/legacy');
    expect(updates).toEqual(['POP /legacy']);
  });

  it('blocks a direct URL-bar hash edit while a blocker is armed', () => {
    const { win, history } = bootedHistory('#/collections/posts/new');
    const confirmChoice = vi.fn(() => false);
    history.block(tx => {
      if (confirmChoice()) tx.retry();
    });

    win.navigateHash('#/collections/other');

    expect(confirmChoice).toHaveBeenCalledTimes(1);
    expect(win.location.hash).toBe('#/collections/posts/new');
    expect(history.location.pathname).toBe('/collections/posts/new');
  });

  it('applies a URL-bar hash edit as POP when nothing blocks it', () => {
    const { win, history } = bootedHistory();
    const updates: string[] = [];
    history.listen(({ action, location }) => updates.push(`${action} ${location.pathname}`));

    win.navigateHash('#/elsewhere');

    expect(updates).toEqual(['POP /elsewhere']);
    expect(history.location.pathname).toBe('/elsewhere');

    // Bookkeeping stays sane afterwards: a push from the adopted foreign
    // entry still stamps a numeric idx (history@5 leaked NaN here).
    history.push('/next');
    expect((win.entries[win.cursor].state as { idx: number }).idx).toBe(1);
  });
});
