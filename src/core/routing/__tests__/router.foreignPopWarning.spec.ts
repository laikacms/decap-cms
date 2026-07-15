import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression test for DCMS-613 / DCMS-569: `history@5`'s hash-history
 * `handlePop` calls `console.warn('You are trying to block a POP
 * navigation...')` whenever a `block()` blocker is armed and a POP lands on a
 * location `history` didn't stamp an `idx` on itself (e.g. a native anchor
 * click, a deep link, or the first browser Back after boot — see
 * `router.ts`'s comment above the filter this test exercises). Unlike
 * `router.spec.ts`, this file does NOT `vi.mock('history')`: it needs the
 * real library so the real `handlePop` warning path actually runs.
 */
describe('router: foreign-POP console.warn filter (DCMS-613)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('swallows the "block a POP navigation" warning history@5 emits for a foreign POP while a blocker is armed', async () => {
    const { defaultRouter } = await import('@/core/routing/router');

    const unblock = defaultRouter.block(tx => {
      // Never call tx.retry() — irrelevant here: history@5 doesn't invoke the
      // blocker at all for a foreign POP (nextIndex == null), it just warns.
      void tx;
    });

    try {
      // Simulate a native hash change history didn't create itself: clear the
      // native history state (so `getIndexAndLocation` resolves `idx` as
      // `undefined`) and change the hash the way a plain `<a href="#...">`
      // click or a deep link would, without going through `history.push`.
      window.history.replaceState(null, '', '#/some/foreign/path');
      window.dispatchEvent(new Event('hashchange'));

      const foreignPopWarning = warnSpy.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].startsWith('You are trying to block a POP'),
      );
      expect(foreignPopWarning).toBeUndefined();
    } finally {
      unblock();
    }
  });

  it('does not suppress unrelated console.warn calls', async () => {
    await import('@/core/routing/router');

    console.warn('some unrelated warning DCMS-613 must not eat');

    expect(warnSpy).toHaveBeenCalledWith('some unrelated warning DCMS-613 must not eat');
  });
});
