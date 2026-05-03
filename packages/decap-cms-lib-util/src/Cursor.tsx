type CursorStoreData = {
  actions: Set<string>;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
};

type ActionHandler = (action: string) => unknown;

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

function createStore(...args: any[]): CursorStoreData {
  let actions: Iterable<string>;
  let data: Record<string, unknown>;
  let meta: Record<string, unknown>;

  if (args.length === 0 || (args.length === 1 && args[0] == null)) {
    actions = [];
    data = {};
    meta = {};
  } else if (args.length === 1) {
    const obj = args[0] as Partial<{
      actions: Iterable<string>;
      data: Record<string, unknown>;
      meta: Record<string, unknown>;
    }>;
    actions = obj.actions ?? [];
    data = obj.data ?? {};
    meta = obj.meta ?? {};
  } else {
    actions = (args[0] as Iterable<string>) ?? [];
    data = (args[1] as Record<string, unknown>) ?? {};
    meta = (args[2] as Record<string, unknown>) ?? {};
  }

  return {
    actions: new Set(actions),
    data: { ...data },
    meta: filterUnknownMetaKeys({ ...meta }),
  };
}

export default class Cursor {
  store!: CursorStoreData;

  get actions() {
    return this.store.actions;
  }
  get data() {
    return this.store.data;
  }
  get meta() {
    return this.store.meta;
  }

  static create(...args: any[]) {
    return new Cursor(...args);
  }

  constructor(...args: any[]) {
    if (args[0] instanceof Cursor) {
      return args[0];
    }
    this.store = createStore(...args);
  }

  private withStore(store: CursorStoreData): Cursor {
    const c = new Cursor();
    c.store = store;
    return c;
  }

  hasAction(action: string): boolean {
    return this.store.actions.has(action);
  }

  addAction(action: string): Cursor {
    return this.withStore({ ...this.store, actions: new Set([...this.store.actions, action]) });
  }

  removeAction(action: string): Cursor {
    return this.withStore({
      ...this.store,
      actions: new Set([...this.store.actions].filter(a => a !== action)),
    });
  }

  setActions(actions: Iterable<string>): Cursor {
    return this.withStore({ ...this.store, actions: new Set(actions) });
  }

  mergeActions(actions: Set<string>): Cursor {
    return this.withStore({ ...this.store, actions: new Set([...this.store.actions, ...actions]) });
  }

  getActionHandlers(handler: ActionHandler): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const action of this.store.actions) {
      result[action] = handler(action);
    }
    return result;
  }

  setData(data: Record<string, unknown>): Cursor {
    return this.withStore({ ...this.store, data: { ...data } });
  }

  mergeData(data: Record<string, unknown>): Cursor {
    return this.withStore({ ...this.store, data: { ...this.store.data, ...data } });
  }

  wrapData(data: Record<string, unknown>): Cursor {
    return this.withStore({
      ...this.store,
      data: { ...data, wrapped_cursor_data: this.store.data },
    });
  }

  unwrapData(): [Record<string, unknown>, Cursor] {
    const { wrapped_cursor_data, ...rest } = this.store.data;
    const innerCursor = this.withStore({
      ...this.store,
      data: (wrapped_cursor_data as Record<string, unknown>) ?? {},
    });
    return [rest, innerCursor];
  }

  clearData(): Cursor {
    return this.withStore({ ...this.store, data: {} });
  }

  setMeta(meta: Record<string, unknown>): Cursor {
    return this.withStore({ ...this.store, meta: filterUnknownMetaKeys({ ...meta }) });
  }

  mergeMeta(meta: Record<string, unknown>): Cursor {
    return this.withStore({
      ...this.store,
      meta: filterUnknownMetaKeys({ ...this.store.meta, ...meta }),
    });
  }
}

export const CURSOR_COMPATIBILITY_SYMBOL = Symbol('cursor key for compatibility with old backends');
