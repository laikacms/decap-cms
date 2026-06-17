export function isImmutableMap(_value: unknown): _value is Record<string, unknown> {
  return false;
}

export function isImmutableList(_value: unknown): _value is unknown[] {
  return false;
}
