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

  it('keeps emitting when the editor content actually changes again after converging', () => {
    const guardChange = createChangeGuard('');

    const firstSlateValue = markdownToSlate(MULTI_SENTENCE_BODY, { editorComponents: Map() });
    const firstMdValue = slateToMarkdown(firstSlateValue, {}, Map());
    expect(guardChange(firstMdValue, () => {})).toBe(true);
    expect(guardChange(firstMdValue, () => {})).toBe(false);

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

  it('accepts the next real change once the in-flight emit has returned', () => {
    const guardChange = createChangeGuard('');
    const calls = [];

    function onEmit(value) {
      calls.push(value);
    }

    expect(guardChange('First paragraph.', onEmit)).toBe(true);
    // Not reentrant - this call happens after the previous onEmit returned,
    // e.g. on the next real keystroke.
    expect(guardChange('First paragraph.\n\nSecond paragraph.', onEmit)).toBe(true);
    expect(calls).toEqual(['First paragraph.', 'First paragraph.\n\nSecond paragraph.']);
  });

  it('does not deadlock: a guard that swallowed a re-entrant call still accepts later changes', () => {
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
    // The guard must not be left "stuck" thinking it's still emitting.
    expect(guardChange('First paragraph.\n\nA later, real edit.', onEmit)).toBe(true);
    expect(calls).toEqual(['First paragraph.', 'First paragraph.\n\nA later, real edit.']);
  });
});
