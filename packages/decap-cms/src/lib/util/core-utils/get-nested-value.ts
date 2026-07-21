/**
 * Looks up a nested value on `obj` by walking `path` one key at a time,
 * short-circuiting to `undefined` as soon as the current value is `null` or
 * `undefined`. Works for object properties and array indices alike, since
 * array indices are addressed the same way as object keys via `path.reduce`.
 */
export function getNestedValue<T = unknown>(obj: unknown, path: string[]): T | undefined {
  return path.reduce<unknown>((cur, key) => (cur != null ? (cur as Record<string, unknown>)[key] : undefined), obj) as
    | T
    | undefined;
}
