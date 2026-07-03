export function shouldEmitChange(nextValue, currentValue) {
  return nextValue !== (currentValue ?? '');
}
