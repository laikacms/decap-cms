/**
 * Configuration-oriented replacement for the `deepmerge` package, matching its
 * default semantics for the value shapes the CMS merges (parsed YAML and
 * user-supplied config literals):
 * - plain objects are merged recursively, source keys winning over target keys
 * - arrays are concatenated (target items first)
 * - any other value (primitives, `undefined`, Date, RegExp, class instances,
 *   functions) is taken from the source as-is
 * - inputs are never mutated and the result shares no plain object or array
 *   references with them
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isUnsafeKey(key: string) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(clone) as T;
  }
  if (isPlainObject(value)) {
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (isUnsafeKey(key)) continue;
      copy[key] = clone(value[key]);
    }
    return copy as T;
  }
  return value;
}

function mergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const destination: Record<string, unknown> = clone(target);
  for (const key of Object.keys(source)) {
    if (isUnsafeKey(key)) continue;
    const targetValue = target[key];
    const sourceValue = source[key];
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      destination[key] = mergeObjects(targetValue, sourceValue);
    } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      destination[key] = [...clone(targetValue), ...clone(sourceValue)];
    } else {
      destination[key] = clone(sourceValue);
    }
  }
  return destination;
}

export function deepMerge<T>(target: Partial<T>, source: Partial<T>): T;
export function deepMerge<T1, T2>(target: T1, source: T2): T1 & T2;
export function deepMerge<T1, T2>(target: T1, source: T2): T1 & T2 {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...clone(target), ...clone(source)] as T1 & T2;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    return mergeObjects(target, source) as T1 & T2;
  }
  return clone(source) as T1 & T2;
}
