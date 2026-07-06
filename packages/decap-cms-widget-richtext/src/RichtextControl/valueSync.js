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
export function createChangeGuard(initialValue) {
  let lastEmittedValue = initialValue ?? '';

  return function guardChange(nextValue, onEmit) {
    if (!shouldEmitChange(nextValue, lastEmittedValue)) {
      return false;
    }
    lastEmittedValue = nextValue;
    onEmit(nextValue);
    return true;
  };
}
