// Type declarations for external modules

// Re-export immutable types - this module has its own types but they may not be found
// when immutable is a peer dependency
declare module 'immutable' {
  export interface Map<K, V> {
    get<T = V>(key: K, notSetValue?: T): T;
    set(key: K, value: V): Map<K, V>;
    setIn(keyPath: Iterable<unknown>, value: unknown): Map<K, V>;
    getIn(keyPath: Iterable<unknown>, notSetValue?: unknown): unknown;
    remove(key: K): Map<K, V>;
    delete(key: K): Map<K, V>;
    update(key: K, updater: (value: V) => V): Map<K, V>;
    updateIn(keyPath: Iterable<unknown>, updater: (value: unknown) => unknown): Map<K, V>;
    merge(...collections: Array<Iterable<[K, V]> | { [key: string]: V }>): Map<K, V>;
    toJS(): { [key: string]: unknown };
    has(key: K): boolean;
    filter(predicate: (value: V, key: K, iter: Map<K, V>) => boolean): Map<K, V>;
    entrySeq(): Seq.Indexed<[K, V]>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
  }

  export interface List<T> {
    get(index: number, notSetValue?: T): T | undefined;
    set(index: number, value: T): List<T>;
    push(...values: T[]): List<T>;
    map<M>(mapper: (value: T, key: number, iter: List<T>) => M): List<M>;
    filter(predicate: (value: T, index: number, iter: List<T>) => boolean): List<T>;
    reduce<R>(reducer: (reduction: R, value: T, key: number, iter: List<T>) => R, initialReduction: R): R;
    toJS(): T[];
    toArray(): T[];
    size: number;
    [Symbol.iterator](): IterableIterator<T>;
  }

  export interface Set<T> {
    has(value: T): boolean;
    add(value: T): Set<T>;
    delete(value: T): Set<T>;
    union(...collections: Array<Iterable<T>>): Set<T>;
    intersect(...collections: Array<Iterable<T>>): Set<T>;
    subtract(...collections: Array<Iterable<T>>): Set<T>;
    toJS(): T[];
    toArray(): T[];
    size: number;
    [Symbol.iterator](): IterableIterator<T>;
  }

  export namespace Seq {
    interface Indexed<T> {
      map<M>(mapper: (value: T, key: number, iter: Seq.Indexed<T>) => M): Seq.Indexed<M>;
      join(separator?: string): string;
      toArray(): T[];
    }
  }

  export function Map<K = string, V = unknown>(collection?: Iterable<[K, V]> | { [key: string]: V }): Map<K, V>;
  export namespace Map {
    function isMap(maybeMap: unknown): maybeMap is Map<unknown, unknown>;
  }
  export function List<T>(collection?: Iterable<T> | ArrayLike<T>): List<T>;
  export function Set<T>(collection?: Iterable<T> | ArrayLike<T>): Set<T>;
  export function fromJS(jsValue: unknown): unknown;
}

declare module 'js-sha256' {
  export function sha256(message: string | ArrayBuffer | Uint8Array): string;
  export function sha224(message: string | ArrayBuffer | Uint8Array): string;
}

declare module 'localforage' {
  interface LocalForageOptions {
    driver?: string | string[];
    name?: string;
    size?: number;
    storeName?: string;
    version?: number;
    description?: string;
  }

  interface LocalForage {
    getItem<T>(key: string): Promise<T | null>;
    setItem<T>(key: string, value: T): Promise<T>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    length(): Promise<number>;
    key(keyIndex: number): Promise<string | null>;
    keys(): Promise<string[]>;
    iterate<T, U>(
      iteratee: (value: T, key: string, iterationNumber: number) => U
    ): Promise<U>;
    setDriver(driverName: string | string[]): Promise<void>;
    config(options: LocalForageOptions): boolean;
    createInstance(options: LocalForageOptions): LocalForage;
    dropInstance(options?: { name?: string; storeName?: string }): Promise<void>;
    ready(): Promise<void>;
    supports(driverName: string): boolean;
    INDEXEDDB: string;
    WEBSQL: string;
    LOCALSTORAGE: string;
  }

  const localforage: LocalForage;
  export default localforage;
}

// LocalForage type for use in function signatures
declare type LocalForage = import('localforage').default;
