import type { LlmPatchOperation } from '@/lib/util/index';

/**
 * RFC 6902 JSON Patch, applied with structural sharing.
 *
 * Written rather than taken off the shelf for one reason: the usual libraries
 * deep-clone the target with a `JSON.parse(JSON.stringify())` round-trip
 * before applying, and entry data holds class instances (`RichtextValue`) that
 * such a clone silently flattens into plain objects. Here only the containers
 * along a patched path are copied; every untouched value stays the same
 * reference, which is also what the Redux reducers want.
 *
 * Input arrives from a language model (`LlmTransport` -> `LlmDocumentBridge`),
 * so every operation is validated before anything is applied, and a bad patch
 * throws `JsonPatchError` with the offending index instead of half-applying.
 */

export class JsonPatchError extends Error {
  constructor(message: string, readonly operationIndex: number) {
    super(`JSON Patch operation ${operationIndex}: ${message}`);
    this.name = 'JsonPatchError';
  }
}

type Container = Record<string, unknown> | unknown[];

const ARRAY_INDEX = /^(?:0|[1-9][0-9]*)$/;

function isContainer(value: unknown): value is Container {
  return typeof value === 'object' && value !== null;
}

/** `~1` is an escaped `/` and `~0` an escaped `~`; unescape in that order. */
function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(pointer: string, index: number): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) {
    throw new JsonPatchError(`path "${pointer}" must be empty or start with "/"`, index);
  }
  return pointer.slice(1).split('/').map(unescapeToken);
}

/** Resolves an array token to an index. `-` (append) is only legal for `add`. */
function arrayIndex(
  token: string,
  array: unknown[],
  index: number,
  { allowAppend = false }: { allowAppend?: boolean } = {},
): number {
  if (token === '-') {
    if (!allowAppend) {
      throw new JsonPatchError('"-" addresses the end of an array and is only valid for add', index);
    }
    return array.length;
  }
  if (!ARRAY_INDEX.test(token)) {
    throw new JsonPatchError(`"${token}" is not a valid array index`, index);
  }
  return Number(token);
}

function readChild(container: Container, token: string, index: number): unknown {
  if (Array.isArray(container)) {
    return container[arrayIndex(token, container, index)];
  }
  return container[token];
}

function hasChild(container: Container, token: string, index: number): boolean {
  if (Array.isArray(container)) {
    // `-` is deliberately not handled here: outside of `add` it is invalid
    // rather than merely absent, and `arrayIndex` says so precisely.
    const position = arrayIndex(token, container, index);
    return position < container.length;
  }
  return Object.prototype.hasOwnProperty.call(container, token);
}

function shallowCopy(container: Container): Container {
  return Array.isArray(container) ? container.slice() : { ...container };
}

/**
 * Rebuilds the spine down to the container that owns `tokens`' last segment
 * and hands it to `transform`, which returns a replacement container. Every
 * node off the path is shared, not copied.
 */
function updateAt(
  node: unknown,
  tokens: string[],
  index: number,
  transform: (container: Container, token: string) => Container,
): unknown {
  const [token, ...rest] = tokens;
  if (!isContainer(node)) {
    throw new JsonPatchError(`path segment "${token}" does not address an object or array`, index);
  }

  if (rest.length === 0) {
    return transform(node, token);
  }

  if (!hasChild(node, token, index)) {
    throw new JsonPatchError(`path segment "${token}" does not exist`, index);
  }
  const updatedChild = updateAt(readChild(node, token, index), rest, index, transform);

  const copy = shallowCopy(node);
  if (Array.isArray(copy)) {
    copy[arrayIndex(token, copy, index)] = updatedChild;
  } else {
    copy[token] = updatedChild;
  }
  return copy;
}

function getAt(document: unknown, tokens: string[], index: number): unknown {
  let node: unknown = document;
  for (const token of tokens) {
    if (!isContainer(node)) {
      throw new JsonPatchError(`path segment "${token}" does not address an object or array`, index);
    }
    if (!hasChild(node, token, index)) {
      throw new JsonPatchError(`path segment "${token}" does not exist`, index);
    }
    node = readChild(node, token, index);
  }
  return node;
}

function addAt(document: unknown, tokens: string[], value: unknown, index: number): unknown {
  if (tokens.length === 0) return value;

  return updateAt(document, tokens, index, (container, token) => {
    const copy = shallowCopy(container);
    if (Array.isArray(copy)) {
      const position = arrayIndex(token, copy, index, { allowAppend: true });
      if (position > copy.length) {
        throw new JsonPatchError(`index ${position} is past the end of the array`, index);
      }
      copy.splice(position, 0, value);
    } else {
      copy[token] = value;
    }
    return copy;
  });
}

function replaceAt(document: unknown, tokens: string[], value: unknown, index: number): unknown {
  if (tokens.length === 0) return value;

  return updateAt(document, tokens, index, (container, token) => {
    if (!hasChild(container, token, index)) {
      throw new JsonPatchError(`cannot replace "${token}": it does not exist`, index);
    }
    const copy = shallowCopy(container);
    if (Array.isArray(copy)) {
      copy[arrayIndex(token, copy, index)] = value;
    } else {
      copy[token] = value;
    }
    return copy;
  });
}

function removeAt(document: unknown, tokens: string[], index: number): unknown {
  if (tokens.length === 0) {
    throw new JsonPatchError('cannot remove the whole document', index);
  }

  return updateAt(document, tokens, index, (container, token) => {
    if (!hasChild(container, token, index)) {
      throw new JsonPatchError(`cannot remove "${token}": it does not exist`, index);
    }
    const copy = shallowCopy(container);
    if (Array.isArray(copy)) {
      copy.splice(arrayIndex(token, copy, index), 1);
    } else {
      delete copy[token];
    }
    return copy;
  });
}

/** RFC 6902 equality: structural, order-insensitive for object keys. */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEquals(item, b[i]));
  }
  if (isContainer(a) && isContainer(b) && !Array.isArray(a) && !Array.isArray(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length
      && aKeys.every(key => Object.prototype.hasOwnProperty.call(b, key) && deepEquals(a[key], b[key]));
  }
  return false;
}

/** `true` when `from` addresses `path` itself or one of its ancestors. */
function isPrefixOf(from: string[], path: string[]): boolean {
  return from.length <= path.length && from.every((token, i) => token === path[i]);
}

function requireValue(operation: LlmPatchOperation, index: number): unknown {
  if (!('value' in operation)) {
    throw new JsonPatchError(`"${operation.op}" requires a value`, index);
  }
  return operation.value;
}

function requireFrom(operation: LlmPatchOperation, index: number): string {
  if (typeof operation.from !== 'string') {
    throw new JsonPatchError(`"${operation.op}" requires a "from" path`, index);
  }
  return operation.from;
}

/**
 * Applies `operations` in order and returns the resulting document. The input
 * is never mutated. Throws `JsonPatchError` on the first invalid or
 * inapplicable operation, leaving the caller with the original document.
 */
export function applyJsonPatch<T>(document: T, operations: LlmPatchOperation[]): T {
  if (!Array.isArray(operations)) {
    throw new JsonPatchError('operations must be an array', 0);
  }

  let result: unknown = document;

  operations.forEach((operation, index) => {
    if (!operation || typeof operation.path !== 'string') {
      throw new JsonPatchError('missing a "path"', index);
    }
    const path = parsePointer(operation.path, index);

    switch (operation.op) {
      case 'add':
        result = addAt(result, path, requireValue(operation, index), index);
        break;

      case 'replace':
        result = replaceAt(result, path, requireValue(operation, index), index);
        break;

      case 'remove':
        result = removeAt(result, path, index);
        break;

      case 'move': {
        const from = parsePointer(requireFrom(operation, index), index);
        if (isPrefixOf(from, path)) {
          // RFC 6902 4.4: "the 'from' location MUST NOT be a proper prefix of
          // the 'path' location" — a container cannot be moved into itself.
          if (from.length < path.length) {
            throw new JsonPatchError('cannot move a location into its own child', index);
          }
          break; // Moving onto itself is a no-op.
        }
        const value = getAt(result, from, index);
        result = addAt(removeAt(result, from, index), path, value, index);
        break;
      }

      case 'copy': {
        const from = parsePointer(requireFrom(operation, index), index);
        result = addAt(result, path, getAt(result, from, index), index);
        break;
      }

      case 'test': {
        const actual = getAt(result, path, index);
        if (!deepEquals(actual, requireValue(operation, index))) {
          throw new JsonPatchError(`test failed at "${operation.path}"`, index);
        }
        break;
      }

      default:
        throw new JsonPatchError(`unknown op "${String(operation.op)}"`, index);
    }
  });

  return result as T;
}
