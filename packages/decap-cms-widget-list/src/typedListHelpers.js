export const TYPES_KEY = 'types';
export const TYPE_KEY = 'typeKey';
export const DEFAULT_TYPE_KEY = 'type';

/**
 * Naive English pluralization used as a fallback when a list field has no
 * explicit `label`/`label_singular`/`label_plural` and we must derive a
 * plural noun from the field name (e.g. `list` -> `lists`, `box` -> `boxes`,
 * `category` -> `categories`). Not linguistically complete — authors with
 * irregular plurals (e.g. `person` -> `people`) should set `label_plural`.
 */
export function pluralize(word) {
  if (!word) {
    return word;
  }
  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }
  if (/[^aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  return `${word}s`;
}

export function getTypedFieldForValue(field, value) {
  const typeKey = resolveFieldKeyType(field);
  const types = field.get(TYPES_KEY);
  const valueType = value.get(typeKey);
  return types.find(type => type.get('name') === valueType);
}

export function resolveFunctionForTypedField(field) {
  const typeKey = resolveFieldKeyType(field);
  const types = field.get(TYPES_KEY);
  return value => {
    const valueType = value.get(typeKey);
    return types.find(type => type.get('name') === valueType);
  };
}

export function resolveFieldKeyType(field) {
  return field.get(TYPE_KEY, DEFAULT_TYPE_KEY);
}

export function getErrorMessageForTypedFieldAndValue(field, value) {
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
