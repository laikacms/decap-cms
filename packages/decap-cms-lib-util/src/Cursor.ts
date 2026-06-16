type CursorStoreObject = {
  actions: Set<string>;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
};

export type CursorStore = CursorStoreObject;

type ActionHandler = (action: string) => unknown;

function toPlainObject(obj: unknown): Record<string, unknown> {
  if (obj === undefined || obj === null) {
    return {};
  }
  if (typeof obj !== 'object') {
    return {};
  }
  return obj as Record<string, unknown>;
}

const knownMetaKeys = new Set([
  'index',
  'page',
  'count',
  'pageSize',
  'pageCount',
  'usingOldPaginationAPI',
  'extension',
  'folder',
  'depth',
]);

function filterUnknownMetaKeys(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(meta).filter(([k]) => knownMetaKeys.has(k)));
}

const CURSOR_STORE_BRAND = Symbol('CursorStore');

type BrandedCursorStore = CursorStore & { [CURSOR_STORE_BRAND]: true };

function brandedStore(store: CursorStore): BrandedCursorStore {
  return Object.assign(store, { [CURSOR_STORE_BRAND]: true as const });
}

function isBrandedStore(obj: unknown): obj is BrandedCursorStore {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<symbol, unknown>)[CURSOR_STORE_BRAND] === true
  );
}

/*
  createCursorStore takes one of three signatures:
  - () -> cursor with empty actions, data, and meta
  - (cursorMap: <object with optional actions, data, and meta keys>) -> cursor
  - (actions: <array>, data: <object>, meta: <optional object>) -> cursor
*/
function createCursorStore(...args: unknown[]): CursorStore {
  // If we receive a branded store directly, use it as-is (internal use)
  if (args.length === 1 && isBrandedStore(args[0])) {
    return args[0];
  }

  let actions: unknown;
  let data: unknown;
  let meta: unknown;

  if (args.length === 1) {
    const obj = toPlainObject(args[0]);
    actions = obj.actions;
    data = obj.data;
    meta = obj.meta;
  } else {
    [actions, data, meta] = args;
  }

  return brandedStore({
    actions:
      actions instanceof Set
        ? (actions as Set<string>)
        : new Set(Array.isArray(actions) ? (actions as string[]) : []),
    data: toPlainObject(data),
    meta: filterUnknownMetaKeys(toPlainObject(meta)),
    [CURSOR_STORE_BRAND]: true as const,
  });
}

function hasAction(store: CursorStore, action: string) {
  return store.actions.has(action);
}

function getActionHandlers(store: CursorStore, handler: ActionHandler) {
  const result: Record<string, unknown> = {};
  for (const action of store.actions) {
    result[action] = handler(action);
  }
  return result;
}

function getIn(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setIn(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) return obj;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  const nested = toPlainObject((obj as Record<string, unknown>)[head]);
  return { ...obj, [head]: setIn(nested, rest, value) };
}

// The cursor logic is entirely functional, so this class simply
// provides a chainable interface
export default class Cursor {
  store?: CursorStore;
  actions?: Set<string>;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;

  static create(...args: unknown[]) {
    return new Cursor(...args);
  }

  constructor(...args: unknown[]) {
    if (args[0] instanceof Cursor) {
      return args[0] as Cursor;
    }

    this.store = createCursorStore(...args);
    this.actions = this.store.actions;
    this.data = this.store.data;
    this.meta = this.store.meta;
  }

  updateStore(
    updater: ((store: CursorStore) => CursorStore) | string,
    fn?: (val: unknown) => unknown,
  ): Cursor {
    if (typeof updater === 'function') {
      return new Cursor(brandedStore(updater(this.store!)));
    }
    // updateStore('key', fn) form
    const key = updater as keyof CursorStore;
    const newStore = brandedStore({
      ...this.store!,
      [key]: fn!((this.store as Record<string, unknown>)[key]),
    });
    return new Cursor(newStore);
  }

  updateInStore(...args: unknown[]): Cursor {
    const [path, fn] = args as [string[], (val: unknown) => unknown];
    const current = getIn(this.store, path);
    const updated = brandedStore(
      setIn(this.store! as Record<string, unknown>, path, fn(current)) as CursorStore,
    );
    return new Cursor(updated);
  }

  hasAction(action: string) {
    return hasAction(this.store!, action);
  }

  addAction(action: string) {
    return this.updateStore('actions', (actions: unknown) => {
      const next = new Set(actions as Set<string>);
      next.add(action);
      return next;
    });
  }

  removeAction(action: string) {
    return this.updateStore('actions', (actions: unknown) => {
      const next = new Set(actions as Set<string>);
      next.delete(action);
      return next;
    });
  }

  setActions(actions: Iterable<string>) {
    return this.updateStore((store: CursorStore) => ({ ...store, actions: new Set(actions) }));
  }

  mergeActions(actions: Set<string>) {
    return this.updateStore('actions', (oldActions: unknown) => {
      const next = new Set(oldActions as Set<string>);
      for (const a of actions) next.add(a);
      return next;
    });
  }

  getActionHandlers(handler: ActionHandler) {
    return getActionHandlers(this.store!, handler);
  }

  setData(data: Record<string, unknown>) {
    return new Cursor(brandedStore({ ...this.store!, data: toPlainObject(data) }));
  }

  mergeData(data: Record<string, unknown>) {
    return new Cursor(
      brandedStore({ ...this.store!, data: { ...this.store!.data, ...toPlainObject(data) } }),
    );
  }

  wrapData(data: Record<string, unknown>) {
    return this.updateStore('data', (oldData: unknown) => ({
      ...toPlainObject(data),
      wrapped_cursor_data: oldData,
    }));
  }

  unwrapData(): [Record<string, unknown>, Cursor] {
    const currentData = this.store!.data;
    const { wrapped_cursor_data, ...outerData } = currentData as Record<string, unknown>;
    const innerCursor = new Cursor(
      brandedStore({ ...this.store!, data: toPlainObject(wrapped_cursor_data) }),
    );
    return [outerData, innerCursor];
  }

  clearData() {
    return this.updateStore('data', () => ({}));
  }

  setMeta(meta: Record<string, unknown>) {
    return this.updateStore((store: CursorStore) => ({
      ...store,
      meta: filterUnknownMetaKeys(toPlainObject(meta)),
    }));
  }

  mergeMeta(meta: Record<string, unknown>) {
    return this.updateStore((store: CursorStore) => ({
      ...store,
      meta: filterUnknownMetaKeys({ ...store.meta, ...toPlainObject(meta) }),
    }));
  }
}

// This is a temporary hack to allow cursors to be added to the
// interface between backend.js and backends without modifying old
// backends at all. This should be removed in favor of wrapping old
// backends with a compatibility layer, as part of the backend API
// refactor.
export const CURSOR_COMPATIBILITY_SYMBOL: unique symbol = Symbol(
  'cursor key for compatibility with old backends',
);

export type CursorCompatibleEntries<T> = T[] & { [CURSOR_COMPATIBILITY_SYMBOL]?: Cursor };
