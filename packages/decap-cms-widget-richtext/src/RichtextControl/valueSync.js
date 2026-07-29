export function shouldEmitChange(nextValue, currentValue) {
  return nextValue !== (currentValue ?? '');
}

// DCMS-337: DCMS-307's fix compared each serialized value against the redux
// store's `currentValue` prop. That guard is insufficient: `currentValue` is
// whatever the store notifies back, and markdownToSlate(slateToMarkdown(x))
// is not a stable round trip for complex/multi-sentence markdown (whitespace,
// escaping, newlines can shift), so the store's value can differ from what
// this editor instance itself just emitted. Comparing against it lets the
// store-notify -> onChange -> store-update loop keep re-triggering, which
// surfaces as React error #185 ("Maximum update depth exceeded").
//
// createChangeGuard breaks that edge: it tracks the value THIS editor
// instance last emitted (updated synchronously before the emit callback
// runs) and gates every subsequent call against that, never against a
// store-derived value that may be stale or unstably re-serialized.
//
// DCMS-583: the DCMS-337 value-equality guard above is still not enough on
// its own. Under specific render-timing windows (e.g. a validation toast
// changing render timing combined with a long Title field widening a
// commit) `onEmit` (the parent's `onChange` -> redux dispatch) can end up
// re-entering `guardChange` *synchronously*, before the original call has
// returned - Plate/React re-notifying this editor instance mid-emit. That
// re-entrant call typically carries a genuinely different serialized value
// (it isn't a stale duplicate `shouldEmitChange` would catch), so it was
// emitted too, and the parent's redux round trip re-entered again, and
// again, until React's "Maximum update depth exceeded" (#185) guard tripped.
//
// The fix does not special-case *why* the timing window opens (toast
// state, Title length, paragraph count are just what happens to expose
// it) - it makes re-entrancy structurally impossible: while an `onEmit`
// call for this editor instance is on the stack, any further call is
// swallowed unconditionally, regardless of whether its value differs from
// `lastEmittedValue`.
//
// DCMS-1661: the DCMS-583 guard above only covers calls literally nested
// on `onEmit`'s own call stack. A rapid (0ms inter-keystroke) burst of
// >=60 chars produces a tight run of onChange calls that are NOT nested in
// each other - each keystroke's onChange arrives *after* the previous
// call's `onEmit` has already returned (so `isEmitting` was already reset
// back to `false` synchronously in the `finally` block), while Plate/Slate
// is still settling the previous keystroke's normalization/commit. Because
// each of those calls carries a genuinely different serialized value, the
// DCMS-337 equality check alone waves every one of them through, and each
// one's `onEmit` (the parent onChange -> redux round trip) widens the
// window further, until React trips error #185. Short bursts (<60 chars)
// stay under whatever timing threshold makes this observable, which is why
// this slipped past the DCMS-583 fix's re-entrancy tests.
//
// The fix: keep the "swallow while emitting" behaviour, but don't reopen
// the gate the instant `onEmit` returns - defer reopening it to a
// microtask. Any call that arrives before that microtask runs (whether
// nested inside `onEmit` or merely arriving moments later in the same
// burst) is coalesced into a single pending value instead of being run
// synchronously or dropped outright, and exactly one follow-up emit is
// flushed once the microtask fires. This bounds the number of synchronous,
// same-tick emits this guard can ever produce to one per microtask tick,
// regardless of how many onChange calls land in between - structurally
// preventing the update-depth cascade - while still converging on the
// final, fully-typed value (unlike silently dropping it).
//
// DCMS-1694: the microtask deferral above only bounds re-entrancy that
// resolves within the current task's microtask checkpoint. A burst of
// separate keystroke events (Playwright's `keyboard.type()` with 0ms
// inter-key delay, or a real held-down key repeat) is NOT one task with
// nested/queued microtask re-entrancy - it is a run of genuinely separate
// macrotasks, one per key event. The microtask queue fully drains between
// every one of them, so by the time the next keystroke's `onChange` runs,
// the previous microtask has already flipped `isEmitting` back to `false`.
// Every keystroke in the burst therefore sees a "clean" guard and passes
// straight through - nothing coalesces across keystrokes at all, and the
// microtask-based guard provides no protection against this burst shape,
// even though it fully closes the single-tick DCMS-583 window. The
// onEmit -> redux dispatch -> prop-value-change -> Plate re-notify chain
// then widens on every keystroke exactly as it did pre-DCMS-1661, until
// React trips error #185.
//
// The fix: reopen the gate on a macrotask boundary (`setTimeout(fn, 0)`)
// instead of a microtask (`queueMicrotask`). A macrotask-scheduled
// callback is only run once the event loop has finished processing the
// *current* task and moved on to the next entry in the macrotask queue -
// it does not resolve just because the microtask queue drained, the way
// `queueMicrotask` does. Back-to-back keystroke tasks that arrive faster
// than that timer fires (which is exactly the 0ms-delay burst shape that
// trips #185) now land while `isEmitting` is still `true` and get
// coalesced into `pendingValue`, the same as same-tick re-entrancy was
// before. This bounds the emit rate to roughly one per macrotask tick
// (browsers typically clamp `setTimeout(fn, 0)` to ~1-4ms, well under a
// single animation frame) regardless of how many keystrokes - same-tick
// or cross-tick - land in between, closing the gap the microtask-only
// bound left open. The tradeoff (per the issue) is a small, sub-frame
// ceiling on value round-trip cadence, which is not perceptible in the UI.
//
// DCMS-1701: the macrotask reopen above bounds the *rate* of emits (at most
// one in flight, one coalesced pending value per macrotask), but it never
// bounded the *length* of a replay chain. A compound burst that combines
// inline autoformat shortcut resolution (`**bold**` + `_italic_`) with a
// paragraph-terminating period + blank line + multi-item list transition,
// all in the same burst, drives more re-normalize passes than either
// ingredient alone - and, critically, those passes don't necessarily
// converge to a stable serialized value on the first, or even second,
// macrotask-boundary replay. Each replay still carries a genuinely
// *different* value from the last (that's exactly what `shouldEmitChange`
// is designed to let through), so the DCMS-1694 guard keeps replaying
// forever, once per macrotask, with no ceiling at all - which is what spins
// the update-depth guard into React error #185, just on a macrotask cadence
// instead of a synchronous one.
//
// The fix: track how many *consecutive* replays (calls made from this
// guard's own reopen callback, as opposed to a fresh call arriving while
// idle) have fired without the chain going idle in between. `nextValue` is
// always the full current serialized document, never a diff, so once that
// count exceeds MAX_CHAIN_REPLAYS the guard drops the in-flight pending
// value instead of replaying it again: the last value that WAS actually
// emitted stands, the chain stops, and the guard goes idle. Because it's
// idle (not still "isEmitting"), the very next call - whether it's the
// user's next keystroke or the next round of the same feedback loop -
// starts a fresh chain rather than being permanently wedged. This bounds
// the total number of replays any single burst can ever produce, on top of
// the existing per-macrotask rate bound, closing the gap the rate bound
// alone left open.
const MAX_CHAIN_REPLAYS = 4;

export function createChangeGuard(initialValue) {
  let lastEmittedValue = initialValue ?? '';
  let isEmitting = false;
  let hasPending = false;
  let pendingValue;
  let chainDepth = 0;

  function guardChange(nextValue, onEmit, isReplay = false) {
    if (isEmitting) {
      hasPending = true;
      pendingValue = nextValue;
      return false;
    }

    chainDepth = isReplay ? chainDepth + 1 : 0;

    if (!shouldEmitChange(nextValue, lastEmittedValue)) {
      return false;
    }

    if (isReplay && chainDepth > MAX_CHAIN_REPLAYS) {
      // DCMS-1701: this burst has replayed too many times in a row without
      // ever going idle - a non-converging feedback loop, not real user
      // input. Drop the pending value and stop the chain here rather than
      // replaying it again; `lastEmittedValue` is left as the last value
      // that genuinely made it out, so a later, real change can still be
      // detected and emitted once the guard is idle again.
      chainDepth = 0;
      return false;
    }

    lastEmittedValue = nextValue;
    isEmitting = true;
    try {
      onEmit(nextValue);
    } finally {
      setTimeout(() => {
        isEmitting = false;
        if (hasPending) {
          const next = pendingValue;
          hasPending = false;
          pendingValue = undefined;
          guardChange(next, onEmit, true);
        } else {
          chainDepth = 0;
        }
      }, 0);
    }
    return true;
  }

  return guardChange;
}
