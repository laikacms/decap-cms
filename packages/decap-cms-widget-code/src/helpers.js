import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';

export function getChangedProps(previous, next, keys) {
  const propNames = keys || uniq(Object.keys(previous), Object.keys(next));
  const changedProps = propNames.reduce((acc, prop) => {
    if (previous[prop] !== next[prop]) {
      acc[prop] = next[prop];
    }
    return acc;
  }, {});
  if (!isEmpty(changedProps)) {
    return changedProps;
  }
}

export function valueToOption(val) {
  if (typeof val === 'string') {
    return { value: val, label: val };
  }
  return { value: val.name, label: val.label || val.name };
}

// Derive a stable, unique identifier from a language's label. Used as a
// fallback for languages that ship with an empty `identifiers` array, so
// they don't all collapse to the same `undefined` dropdown value.
export function slugifyLabel(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
