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
export function createChangeGuard(initialValue) {
  let lastEmittedValue = initialValue ?? '';
  let isEmitting = false;

  return function guardChange(nextValue, onEmit) {
    if (isEmitting) {
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
      isEmitting = false;
    }
    return true;
  };
}
