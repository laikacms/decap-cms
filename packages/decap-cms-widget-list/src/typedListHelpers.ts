import type { Map, List } from 'immutable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImmutableField = Map<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImmutableValue = Map<string, any>;

export const TYPES_KEY = 'types';
export const TYPE_KEY = 'typeKey';
export const DEFAULT_TYPE_KEY = 'type';

export function getTypedFieldForValue(field: ImmutableField, value: ImmutableValue): ImmutableField {
  const typeKey = resolveFieldKeyType(field);
  const types = field.get(TYPES_KEY) as List<ImmutableField>;
  const valueType = value.get(typeKey);
  return types.find((type: ImmutableField) => type.get('name') === valueType) as ImmutableField;
}

export function resolveFunctionForTypedField(field: ImmutableField) {
  const typeKey = resolveFieldKeyType(field);
  const types = field.get(TYPES_KEY) as List<ImmutableField>;
  return (value: ImmutableValue) => {
    const valueType = value.get(typeKey);
    return types.find((type: ImmutableField) => type.get('name') === valueType);
  };
}

export function resolveFieldKeyType(field: ImmutableField): string {
  return field.get(TYPE_KEY, DEFAULT_TYPE_KEY);
}

export function getErrorMessageForTypedFieldAndValue(field: ImmutableField, value: ImmutableValue): string {
  const keyType = resolveFieldKeyType(field);
  const type = value.get(keyType);
  let errorMessage;
  if (!type) {
    errorMessage = `Error: item has no '${keyType}' property`;
  } else {
    errorMessage = `Error: item has illegal '${keyType}' property: '${type}'`;
  }
  return errorMessage;
}
