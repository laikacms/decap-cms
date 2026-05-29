import get from 'lodash/get';
import { isObject } from 'lodash';

import type { CmsField, CmsFieldList } from '../lib-util/index';

export const TYPES_KEY = 'types';
export const TYPE_KEY = 'typeKey';
export const DEFAULT_TYPE_KEY = 'type';

export function getTypedFieldForValue(
  field: CmsFieldList,
  value: Record<string, unknown> | unknown,
): CmsField | undefined {
  if (!isObject(value)) return undefined; // The value is not an object so it cannot have a type key, list control has a fallback for this.
  const typeKey = resolveFieldKeyType(field);
  const types = field[TYPES_KEY] ?? [];
  const valueType = get(value, typeKey);
  return types.find((type: CmsField) => type['name'] === valueType) as CmsField | undefined;
}

export function resolveFunctionForTypedField(field: CmsFieldList) {
  const typeKey = resolveFieldKeyType(field);
  const types = field[TYPES_KEY] ?? [];
  return (value: CmsField) => {
    const valueType = get(value, typeKey);
    return types.find((type: CmsField) => type['name'] === valueType);
  };
}

export function resolveFieldKeyType(field: CmsFieldList): string {
  return get(field, TYPE_KEY, DEFAULT_TYPE_KEY);
}

export function getErrorMessageForTypedFieldAndValue(
  field: CmsFieldList,
  value: Record<string, unknown>,
): string {
  const keyType = resolveFieldKeyType(field);
  const type = get(value, keyType);
  let errorMessage;
  if (!type) {
    errorMessage = `Error: item has no '${keyType}' property`;
  } else {
    errorMessage = `Error: item has illegal '${keyType}' property: '${type}'`;
  }
  return errorMessage;
}
