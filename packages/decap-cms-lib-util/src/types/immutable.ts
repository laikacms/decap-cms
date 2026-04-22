import { Map as ImmutableMap, List as ImmutableList, type FromJSNoTransform, fromJS as immutableFromJS } from "immutable";

export function isImmutableMap(value: unknown): value is ImmutableMap<string, unknown> {
  return ImmutableMap.isMap(value);
}

export function isImmutableList(value: unknown): value is ImmutableList<unknown> {
  return ImmutableList.isList(value);
}

export interface StaticallyTypedRecord<T> extends ImmutableMap<keyof T, T[keyof T]> {
  get<K extends PropertyKey>(key: K, defaultValue?: unknown): K extends keyof T ? T[K] : undefined;
  set<K extends PropertyKey, V>(key: K, value: V): this;
  has<K extends PropertyKey>(key: K): boolean;
  delete<K extends PropertyKey>(key: K): this;
}
