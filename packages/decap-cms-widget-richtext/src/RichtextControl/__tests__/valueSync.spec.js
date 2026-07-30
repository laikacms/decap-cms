import { Map } from 'immutable';

import { shouldEmitChange, createChangeGuard } from '../valueSync';
import { markdownToSlate, slateToMarkdown } from '../../serializers';

// DCMS-1694: the guard now reopens on a macrotask (`setTimeout(fn, 0)`)
// rather than a microtask, so tests that need to wait for it to "settle"
// must yield a real macrotask, not just drain the microtask queue
// (`await Promise.resolve()`). This helper does that.
function settle() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

const MULTI_SENTENCE_BODY =
  'This is the first sentence of a longer body. This is the second sentence, ' +
  'with a comma and more words to make the string non-trivial.\n\n' +
  'A second paragraph follows, with *emphasis* and **bold** text, so the ' +
  'markdown round trip has more surface area than a single short string.';

describe('shouldEmitChange', () => {
  it('returns false when the serialized value is unchanged', () => {
    expect(shouldEmitChange('Hello world', 'Hello world')).toBe(false);
  });

  it('returns true when the serialized value differs', () => {
    expect(shouldEmitChange('Hello world!', 'Hello world')).toBe(true);
  });

  it('treats an undefined current value as empty string', () => {
    expect(shouldEmitChange('', undefined)).toBe(false);
    expect(shouldEmitChange('Hello', undefined)).toBe(true);
  });

  it('breaks the DCMS-307 selection-only-change loop', () => {
    // Plate's onChange fires on selection-only changes too (no document
    // mutation), which previously re-emitted the same markdown value on every
    // notification and caused an infinite store update loop (React #185).
    const currentValue = 'Some title body text.';
    const rerenderedSameValue = 'Some title body text.';
    expect(shouldEmitChange(rerenderedSameValue, currentValue)).toBe(false);
  });
});

// DCMS-337 regression: DCMS-307's fix (shouldEmitChange compared against the
// redux-store-derived `currentValue` prop) shipped as "fixed" but did not
// actually break the loop, because `currentValue` can lag behind an
// in-flight onChange -> store-update round trip (it is read from a closure
// that isn't guaranteed to reflect the update this very handleChange call is
// about to trigger). The previous regression test above only exercised the
// pure comparator with two already-equal strings — it never exercised the
// scenario where the *store's* value is what's stale, which is exactly what
// happens under rapid typing/Save-clicking with longer, multi-sentence
// content. These tests exercise the real handleChange path end-to-end
// (real slateToMarkdown/markdownToSlate serializers, real
// createChangeGuard) instead of asserting on the isolated comparator.
describe('createChangeGuard (DCMS-337: handleChange store-feedback loop)', () => {
  it('converges after a single emit for multi-sentence content, even when the store prop is stale', () => {
    // Simulate VisualEditor.handleChange: the user types a multi-sentence
    // body, Slate/Plate produces a value, and it gets serialized to markdown.
    const slateValue = markdownToSlate(MULTI_SENTENCE_BODY, { editorComponents: Map() });
    const mdValue = slateToMarkdown(slateValue, {}, Map());

    const emitted = [];
    function onEmit(value) {
      emitted.push(value);
    }

    // The editor mounts with an empty field value (nothing typed yet).
    const guardChange = createChangeGuard('');

    // First real edit: guard should emit exactly once.
    expect(guardChange(mdValue, onEmit)).toBe(true);

    // Plate re-fires onChange multiple times afterwards (selection-only
    // changes, or the store's `notify` cycle re-entering before the redux
    // subscription has propagated the new value back into this component's
    // props) with the SAME serialized value. Critically, the store's own
    // `currentValue` may still be the OLD ('') value at this point — that's
    // exactly the staleness DCMS-307's plain `shouldEmitChange(next,
    // currentValue)` guard was vulnerable to. createChangeGuard must not
    // care: it never looks at the store's value at all.
    for (let i = 0; i < 5; i += 1) {
      expect(guardChange(mdValue, onEmit)).toBe(false);
    }

    expect(emitted).toEqual([mdValue]);
  });

  it('demonstrates the DCMS-307 guard alone (currentValue-based) does not converge under closure staleness', () => {
    // This is the failure mode DCMS-337 fixes: if the comparison is made
    // against a `currentValue` that hasn't yet caught up with the previous
    // emit (e.g. because the redux round trip is async), the plain
    // comparator keeps saying "yes, emit" on every notification.
    const slateValue = markdownToSlate(MULTI_SENTENCE_BODY, { editorComponents: Map() });
    const mdValue = slateToMarkdown(slateValue, {}, Map());

    const staleCurrentValue = ''; // never updated across the simulated notifications
    const emitCount = [1, 2, 3, 4, 5].filter(() =>
      shouldEmitChange(mdValue, staleCurrentValue),
    ).length;

    // Every single notification re-triggers an emit — this is the runaway
    // loop that surfaces as React error #185.
    expect(emitCount).toBe(5);
  });

  it('keeps emitting when the editor content actually changes again after converging', async () => {
    const guardChange = createChangeGuard('');

    const firstSlateValue = markdownToSlate(MULTI_SENTENCE_BODY, { editorComponents: Map() });
    const firstMdValue = slateToMarkdown(firstSlateValue, {}, Map());
    expect(guardChange(firstMdValue, () => {})).toBe(true);

    // Let the first emit settle (DCMS-1661: the guard reopens on the next
    // microtask, not synchronously) before asserting the duplicate-value
    // guard against it.
    await settle();

    expect(guardChange(firstMdValue, () => {})).toBe(false);

    await settle();

    const secondBody = `${MULTI_SENTENCE_BODY}\n\nAnd now a third paragraph was added.`;
    const secondSlateValue = markdownToSlate(secondBody, { editorComponents: Map() });
    const secondMdValue = slateToMarkdown(secondSlateValue, {}, Map());

    expect(secondMdValue).not.toBe(firstMdValue);
    expect(guardChange(secondMdValue, () => {})).toBe(true);
  });
});

// DCMS-583: React error #185 ("Maximum update depth exceeded") while typing
// multi-paragraph text into the richtext body, reproducible only after a
// save-with-empty-required-fields validation toast plus a >=120-char Title.
// That specific combination isn't what matters (it's just what widens the
// render-timing window); the actual bug is that `onEmit` (the parent's
// onChange -> redux dispatch) can re-enter `guardChange` *synchronously*,
// before the first call returns, with a genuinely different value that the
// DCMS-337 value-equality guard alone would happily let through - each
// re-entrant emit re-entering again until React trips its update-depth
// guard. These tests exercise that re-entrancy directly, independent of any
// toast/title/paragraph-count trigger, proving the guard suppresses it
// structurally.
describe('createChangeGuard (DCMS-583: re-entrant onChange during value/prop churn)', () => {
  it('suppresses a synchronous re-entrant emit even when its value differs from the in-flight one', () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    let reentered = false;
    function onEmit(value) {
      calls.push(value);
      if (!reentered) {
        reentered = true;
        // Simulate Plate/React re-notifying this same editor instance
        // synchronously while this onEmit call (standing in for the
        // parent's onChange -> redux round trip) is still on the stack -
        // with a value that has genuinely moved on, not a stale duplicate.
        expect(guardChange('Second paragraph typed during the re-entrant call.', onEmit)).toBe(
          false,
        );
      }
    }

    expect(guardChange('First paragraph.', onEmit)).toBe(true);
    expect(calls).toEqual(['First paragraph.']);
  });

  it('accepts the next real change once the in-flight emit has settled', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    function onEmit(value) {
      calls.push(value);
    }

    expect(guardChange('First paragraph.', onEmit)).toBe(true);
    // DCMS-1661: this call is not nested inside the previous onEmit, but it
    // arrives in the same synchronous tick (before that emit has "settled" -
    // see the DCMS-1661 describe block below), so it is coalesced into a
    // pending value and flushed on the next microtask tick rather than
    // re-entering synchronously.
    expect(guardChange('First paragraph.\n\nSecond paragraph.', onEmit)).toBe(false);
    expect(calls).toEqual(['First paragraph.']);

    await settle();

    expect(calls).toEqual(['First paragraph.', 'First paragraph.\n\nSecond paragraph.']);
  });

  it('does not deadlock: a guard that swallowed a re-entrant call still accepts later changes', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    let reentered = false;
    function onEmit(value) {
      calls.push(value);
      if (!reentered) {
        reentered = true;
        guardChange('Reentrant value, swallowed.', onEmit);
      }
    }

    expect(guardChange('First paragraph.', onEmit)).toBe(true);
    // The guard must not be left "stuck" thinking it's still emitting -
    // this later, real edit is coalesced (DCMS-1661) rather than accepted
    // synchronously, but it must still make it through once settled.
    expect(guardChange('First paragraph.\n\nA later, real edit.', onEmit)).toBe(false);

    await settle();

    expect(calls).toEqual(['First paragraph.', 'First paragraph.\n\nA later, real edit.']);
  });
});

// DCMS-1661: React error #185 while burst-typing (>=60 chars, 0ms
// inter-keystroke delay) natural sentence text into a fresh richtext body.
// The DCMS-583 guard above only swallows calls literally nested on
// `onEmit`'s own call stack; it reopens the gate synchronously the instant
// `onEmit` returns. A rapid burst produces a tight run of onChange calls
// that are NOT nested in each other (each arrives after the previous
// `onEmit` already returned) while Plate/Slate is still settling the
// previous keystroke's normalization/commit - so the DCMS-583 guard waves
// every one of them through as a "fresh" change, and each one's onEmit (the
// parent onChange -> redux round trip) widens the window further until
// React trips the update-depth guard. These tests exercise that exact
// codepath: many back-to-back (non-nested), genuinely-different-valued
// calls arriving within the same synchronous burst.
describe('createChangeGuard (DCMS-1661: coalescing rapid non-nested onChange bursts)', () => {
  it('bounds a large synchronous burst to a single immediate emit, converging to the final value once settled', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];
    function onEmit(value) {
      calls.push(value);
    }

    // Simulate ~70 chars of burst-typed content: one onChange per keystroke,
    // each with a genuinely different (longer) serialized value, all
    // arriving back-to-back in the same synchronous script execution - as
    // Playwright's `keyboard.type(text)` with no `delay` would produce.
    const total = 70;
    for (let i = 1; i <= total; i += 1) {
      guardChange('abc. '.repeat(i), onEmit);
    }

    // Only the very first keystroke's change may emit synchronously. Every
    // other call in the burst must be coalesced, never run synchronously -
    // this is what bounds the synchronous update-depth regardless of how
    // long the burst is, structurally preventing React error #185.
    expect(calls).toEqual(['abc. ']);

    // Let the guard's deferred release/flush macrotask fire.
    await settle();

    // The burst still converges on the true final value - no keystrokes are
    // silently lost - it just takes one extra (coalesced) emit instead of
    // `total` synchronous re-entrant ones.
    expect(calls).toEqual(['abc. ', 'abc. '.repeat(total)]);
  });

  it('never nests onEmit calls, even under a burst, so a real, misbehaving onEmit cannot blow the stack', async () => {
    const guardChange = createChangeGuard('');
    let maxObservedDepth = 0;
    let currentDepth = 0;

    function onEmit() {
      currentDepth += 1;
      maxObservedDepth = Math.max(maxObservedDepth, currentDepth);
      // Nothing else to do; just record how deep we are while "in" onEmit.
      currentDepth -= 1;
    }

    for (let i = 1; i <= 100; i += 1) {
      guardChange(`value-${i}`, onEmit);
    }

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await settle();
    }

    expect(maxObservedDepth).toBe(1);
  });
});

// DCMS-1694: the DCMS-1661 fix above bounds re-entrancy that resolves
// within the current task's microtask checkpoint - its own regression
// tests prove that by awaiting `Promise.resolve()` (a microtask) between
// calls. But the real-world crash it was meant to prevent (Playwright's
// `keyboard.type()` with 0ms inter-key delay, or a real held-down key
// repeat) dispatches each keystroke's onChange from a genuinely separate
// *macrotask* - each one arrives as its own task on the event loop, not
// nested inside another call and not merely awaiting a microtask.
//
// A NOTE ON TEST SHAPE: it's tempting to simulate that by awaiting a fresh
// `new Promise(r => setTimeout(r, 0))` *between* each `guardChange` call
// (mirroring the microtask-based DCMS-1661 tests above, just swapping
// `Promise.resolve()` for a macrotask). That pattern does NOT discriminate
// here, though: a macrotask-reopening guard schedules its own
// `setTimeout(fn, 0)` the instant a call is emitted, and that timer gets
// queued *before* the test's own "wait one macrotask" timer for the next
// iteration - so by construction the guard would already have reopened by
// the time the next call fires, on both the fixed and the pre-fix code,
// and the test would never observe a difference. What actually reproduces
// the bug is many keystroke-tasks landing in the macrotask queue *ahead
// of* the guard's own reopen callback - i.e. queued back-to-back, the way
// a burst of real/CDP-dispatched key events actually arrives, faster than
// a fresh JS timer can be scheduled and fire in response to each one. So
// these tests pre-schedule every keystroke's `guardChange` call as its own
// `setTimeout(fn, 0)` macrotask up front (all enqueued before any of them
// run), then let the event loop drain: each callback is a separate task
// (never nested, never just a microtask away from the last one), but
// enough of them are already queued ahead of the guard's own reopen timer
// to reproduce the burst. Against the pre-DCMS-1694 code (reopen on
// `queueMicrotask`, which drains completely before the next queued
// `setTimeout` task even runs), every one of these calls passes the guard
// as "clean" and the assertions below fail - exactly the runaway pattern
// that trips React #185.
describe('createChangeGuard (DCMS-1694: coalescing bursts across macrotask-separated keystrokes)', () => {
  async function flushMacrotasks(count) {
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  it('bounds a burst of macrotask-scheduled keystrokes to far fewer emits than keystrokes', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];
    function onEmit(value) {
      calls.push(value);
    }

    // Exact DCMS-1661/DCMS-1694 repro shape: 60 chars, 'abc. ' x 12 - each
    // keystroke's onChange dispatched from its own macrotask (a distinct
    // `setTimeout(fn, 0)` task), all scheduled up front so they queue up
    // ahead of the guard's own reopen callback, matching how Playwright's
    // keyboard.type()/real key-repeat delivers a 0ms-delay burst as many
    // separate tasks rather than one synchronous script execution.
    const total = 12;
    for (let i = 1; i <= total; i += 1) {
      const value = 'abc. '.repeat(i);
      setTimeout(() => guardChange(value, onEmit), 0);
    }

    // Let the burst of scheduled tasks run, then let any coalesced replay
    // (itself deferred by one more macrotask) flush too.
    await flushMacrotasks(total + 3);

    // On the pre-fix (queueMicrotask) guard, isEmitting is reset before
    // the next queued macrotask ever runs, so every one of the 12
    // keystrokes passes the guard and emits - calls.length === 12. The fix
    // must collapse this cross-tick burst the same way the guard already
    // collapses a same-tick one: far fewer emits than keystrokes, and the
    // final emitted value must still be the fully-typed string (no
    // keystrokes silently dropped).
    expect(calls.length).toBeLessThan(total);
    expect(calls[calls.length - 1]).toBe('abc. '.repeat(total));
  });

  it('never lets two macrotask-scheduled onEmit calls stack synchronously', async () => {
    const guardChange = createChangeGuard('');
    let maxObservedDepth = 0;
    let currentDepth = 0;

    function onEmit() {
      currentDepth += 1;
      maxObservedDepth = Math.max(maxObservedDepth, currentDepth);
      currentDepth -= 1;
    }

    const total = 20;
    for (let i = 1; i <= total; i += 1) {
      const value = `value-${i}`;
      setTimeout(() => guardChange(value, onEmit), 0);
    }

    await flushMacrotasks(total + 3);

    expect(maxObservedDepth).toBe(1);
  });
});

// DCMS-1701: React error #185 still fires on a compound burst that combines
// BOTH (1) inline autoformat shortcut resolution in the same paragraph
// (`**bold**` + `_italic_`) and (2) a paragraph-terminating period + blank
// line + multi-item `- ` list block transition, in the same input burst.
// Neither ingredient alone reproduces it - each settles in one or two
// macrotask-boundary replays, well within what DCMS-1694's guard bounds.
//
// The DCMS-1694 guard (reopen on `setTimeout(fn, 0)`, coalesce into a
// single `pendingValue`) bounds the *rate* of emits to roughly one per
// macrotask, and every existing regression test above confirms a burst
// converges to a stable final value within a couple of those macrotask
// replays. What none of them exercise is what happens when the value
// *never* converges - when each replay's `onEmit` (standing in for the
// parent's onChange -> redux round trip) is itself what schedules the next
// re-notification, and that re-notification's serialized value keeps
// changing (as the compound autoformat-then-list-transition normalize
// passes settle marks/list nesting across more than one hop). The rate
// guard alone does not help here: it happily keeps emitting once per
// macrotask forever, because each one legitimately "differs" from the
// last per `shouldEmitChange` - there was never a ceiling on the total
// *length* of a replay chain, only on how many calls land in any single
// macrotask window. That unbounded chain is what spins the update-depth
// guard into React error #185, exactly as an unbounded *rate* did before
// DCMS-1694.
describe('createChangeGuard (DCMS-1701: compound autoformat + block-transition non-converging burst)', () => {
  async function flushMacrotasks(count) {
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  it('bounds a chain of replays whose onEmit round trip never settles on a stable value', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    // Simulates the DCMS-1701 repro shape: "Hello **bold** and _italic_
    // end.\n\n- One\n- Two" typed as one burst. VisualEditor has no re-sync
    // effect from props back into the Slate document, but the compound
    // inline-mark-resolution + paragraph -> list block-transition normalize
    // pass settles across more than one macrotask-boundary replay, and each
    // settled value differs slightly from the last (e.g. trailing
    // whitespace on the last list item flips as marks/list nesting
    // re-normalize) before truly stabilizing - it never actually converges
    // to a fixed point within any bound the DCMS-1694 guard enforces.
    const VALUES = [
      'Hello **bold** and _italic_ end.\n\n- One\n- Two',
      'Hello **bold** and _italic_ end.\n\n- One\n- Two ',
    ];
    const HARD_TEST_CUTOFF = 40; // only so a pre-fix run terminates at all

    function onEmit(value) {
      calls.push(value);
      if (calls.length < HARD_TEST_CUTOFF) {
        // Re-notify with the NEXT (still-different, non-converging) value -
        // arriving nested on this onEmit's own call stack, the same shape
        // as the DCMS-583 re-entrancy the guard already coalesces.
        guardChange(VALUES[calls.length % VALUES.length], onEmit);
      }
    }

    guardChange(VALUES[0], onEmit);

    await flushMacrotasks(HARD_TEST_CUTOFF + 5);

    // Pre-fix: every replay's value is genuinely different from the last
    // (an A/B oscillation still passes `shouldEmitChange` every time), so
    // nothing in the DCMS-1694 guard ever stops the chain - it runs all the
    // way to this test's own artificial cutoff (calls.length reaches 40).
    // The fix must cut the chain off itself, structurally, long before
    // that - a handful of replays at most, not dozens.
    expect(calls.length).toBeLessThan(10);
  });

  it('still emits a genuinely new edit after a non-converging chain has been cut off', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];
    let loops = 0;

    const VALUES = ['Value A', 'Value B'];

    function onEmit(value) {
      calls.push(value);
      loops += 1;
      if (loops < 40) {
        guardChange(VALUES[loops % VALUES.length], onEmit);
      }
    }

    guardChange(VALUES[0], onEmit);

    await flushMacrotasks(45);

    const emitsDuringOscillation = calls.length;
    expect(emitsDuringOscillation).toBeLessThan(10);

    // The guard must not be left permanently wedged after cutting off the
    // non-converging chain - a later, genuinely new edit (unrelated to the
    // oscillating pair above) must still make it through once the guard is
    // idle again.
    expect(guardChange('A brand new, unrelated edit.', () => {})).toBe(true);
  });
});

// DCMS-1717: React error #185 still fires (3x) on a plain-text ". "-heavy
// burst (e.g. "abc. " x 12, typed 6 times back-to-back with 0ms inter-key
// delay) that contains NONE of the DCMS-1701 ingredients (no **bold**,
// no _italic_, no `- ` list transitions). The DCMS-1701 chain-depth cap only
// ever counted a call as part of a replay chain if it arrived nested on
// `onEmit`'s own stack, or while `isEmitting` was still `true` (i.e. within
// the single macrotask-tick reopen window). Sentence/paragraph-close
// normalization can re-fire `onChange` with a still-different value slightly
// *later* than that - after the single-tick reopen has already flipped
// `isEmitting` back to `false` - at which point VisualEditor's handleChange
// calls `guardChange` with the default `isReplay = false`, indistinguishable
// from a genuinely new, idle keystroke: `chainDepth` resets to 0 and the
// non-converging value sails through, exactly the loop the cap was supposed
// to bound.
describe('createChangeGuard (DCMS-1717: plain-text period-burst replay arriving past a single-tick reopen)', () => {
  async function flushMacrotasks(count) {
    for (let i = 0; i < count; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  it('bounds a non-converging chain whose re-notification lands one tick after the reopen fires', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    // Simulates the DCMS-1717 repro shape: a plain, period-heavy burst with
    // no inline formatting or list markers. Each "settled" paragraph-close
    // normalize pass produces a genuinely different value from the last
    // (e.g. trailing whitespace/mark state flips), and - critically - each
    // re-notification is scheduled two macrotask ticks out from the previous
        // onEmit (`setTimeout(() => setTimeout(fn, 0), 0)`), landing *after* a
    // single-tick reopen would already have gone idle, rather than nested on
    // `onEmit`'s own stack or coalesced within a single tick the way the
    // DCMS-1701 test simulates it.
    const VALUES = ['abc. abc. abc. abc. ', 'abc. abc. abc. abc.  '];
    const HARD_TEST_CUTOFF = 40; // only so a pre-fix run terminates at all

    function onEmit(value) {
      calls.push(value);
      if (calls.length < HARD_TEST_CUTOFF) {
        setTimeout(() => {
          setTimeout(() => {
            guardChange(VALUES[calls.length % VALUES.length], onEmit);
          }, 0);
        }, 0);
      }
    }

    guardChange(VALUES[0], onEmit);

    await flushMacrotasks(HARD_TEST_CUTOFF * 3 + 5);

    // Pre-fix: a single-tick reopen has already gone idle by the time each
    // two-tick-delayed re-notification lands, so every one of them looks
    // like a fresh, idle call - chainDepth resets every time and nothing
    // ever bounds the chain; it runs all the way to this test's artificial
    // cutoff. The fix must cut the chain off itself, structurally, long
    // before that.
    expect(calls.length).toBeLessThan(10);
  });

  it('still emits a genuinely new edit after a delayed non-converging chain has been cut off', async () => {
    const guardChange = createChangeGuard('');
    const calls = [];
    let loops = 0;

    const VALUES = ['Value A', 'Value B'];

    function onEmit(value) {
      calls.push(value);
      loops += 1;
      if (loops < 40) {
        setTimeout(() => {
          setTimeout(() => {
            guardChange(VALUES[loops % VALUES.length], onEmit);
          }, 0);
        }, 0);
      }
    }

    guardChange(VALUES[0], onEmit);

    await flushMacrotasks(130);

    const emitsDuringOscillation = calls.length;
    expect(emitsDuringOscillation).toBeLessThan(10);

    // The guard must not be left permanently wedged after cutting off the
    // delayed non-converging chain - a later, genuinely new edit must still
    // make it through once the guard is idle again.
    expect(guardChange('A brand new, unrelated edit.', () => {})).toBe(true);
  });
});
