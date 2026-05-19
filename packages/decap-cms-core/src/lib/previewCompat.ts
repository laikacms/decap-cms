import React from 'react';

/**
 * Preview-template data compatibility.
 *
 * Before v4, custom preview templates received the entry (and `widgetsFor` /
 * `getCollection` results) as Immutable.js structures and accessed them with
 * `.get()` / `.getIn()` / `.toJS()`. v4 removed Immutable.js and passes plain
 * objects, which silently broke every existing preview template.
 *
 * `toPreviewCompat` wraps a plain object/array in a Proxy that:
 *  - keeps normal plain access working (`entry.data.title`), and
 *  - re-implements the Immutable read API (`getIn`, `get`, `toJS`, `size`) on
 *    top of the plain data, recursively.
 *
 * This lets templates written for either API work unchanged. No Immutable.js
 * dependency is involved — it is a thin read-only adapter.
 */

function deepGet(target: any, path: unknown): unknown {
  const keys = Array.isArray(path) ? path : [path];
  return keys.reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), target);
}

export function toPreviewCompat<T>(value: T): T {
  // Primitives, null/undefined and React elements are returned untouched.
  if (value == null || typeof value !== 'object' || React.isValidElement(value)) {
    return value;
  }

  return new Proxy(value as object, {
    get(target: any, prop, receiver) {
      switch (prop) {
        case 'getIn':
          return (path: unknown, notSetValue?: unknown) => {
            const result = deepGet(target, path);
            return toPreviewCompat(result === undefined ? notSetValue : result);
          };
        case 'get':
          return (key: PropertyKey, notSetValue?: unknown) => {
            const result = target[key];
            return toPreviewCompat(result === undefined ? notSetValue : result);
          };
        case 'toJS':
        case 'toJSON':
          return () => target;
        case 'size':
          if (Array.isArray(target)) {
            return target.length;
          }
          break;
        default:
          break;
      }
      // Wrap nested values so chained Immutable-style access keeps working.
      return toPreviewCompat(Reflect.get(target, prop, receiver));
    },
  }) as T;
}
