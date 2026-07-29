import { Map } from 'immutable';

import { shouldEmitChange, createChangeGuard } from '../valueSync';
import { markdownToSlate, slateToMarkdown } from '../../serializers';

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
    await Promise.resolve();
    await Promise.resolve();

    expect(guardChange(firstMdValue, () => {})).toBe(false);

    await Promise.resolve();
    await Promise.resolve();

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

    await Promise.resolve();
    await Promise.resolve();

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

    await Promise.resolve();
    await Promise.resolve();

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

    // Let the guard's deferred release/flush microtasks drain.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

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

    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    expect(maxObservedDepth).toBe(1);
  });
});
