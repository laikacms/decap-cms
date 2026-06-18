export function isImmutableMap(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isImmutableList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
