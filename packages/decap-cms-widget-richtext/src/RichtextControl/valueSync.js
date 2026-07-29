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
export function createChangeGuard(initialValue) {
  let lastEmittedValue = initialValue ?? '';
  let isEmitting = false;
  let hasPending = false;
  let pendingValue;

  function guardChange(nextValue, onEmit) {
    if (isEmitting) {
      hasPending = true;
      pendingValue = nextValue;
      return false;
    }
    if (!shouldEmitChange(nextValue, lastEmittedValue)) {
      return false;
    }
    lastEmittedValue = nextValue;
    isEmitting = true;
    try {
      onEmit(nextValue);
    } finally {
      queueMicrotask(() => {
        isEmitting = false;
        if (hasPending) {
          const next = pendingValue;
          hasPending = false;
          pendingValue = undefined;
          guardChange(next, onEmit);
        }
      });
    }
    return true;
  }

  return guardChange;
}
