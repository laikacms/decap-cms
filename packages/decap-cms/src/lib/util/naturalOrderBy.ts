import { get } from 'lodash-es';

/**
 * Drop-in replacement for lodash-es `orderBy` that natural/numeric-sorts
 * string criteria (e.g. `'post # 2'` before `'post # 10'`) instead of
 * falling back to plain UTF-16 lexicographic compare.
 *
 * Numeric, date, boolean, and other non-string criteria keep the exact
 * comparison semantics of lodash's own `compareAscending` (mirrored below),
 * so switching call sites over from `orderBy` carries no sort-order
 * regression for anything but string fields.
 */

type Order = 'asc' | 'desc';
type Iteratee<T> = string | ((value: T) => unknown);

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// Mirrors lodash-es `_compareAscending.js`, replacing the `>`/`<` operators
// with `Intl.Collator#compare` only when both operands are strings. All
// null/undefined/symbol/NaN edge-case handling is left untouched so
// non-string comparisons behave identically to `orderBy`.
function compareAscendingNatural(value: unknown, other: unknown): number {
  if (value !== other) {
    const valIsDefined = value !== undefined;
    const valIsNull = value === null;
    const valIsReflexive = value === value;
    const valIsSymbol = typeof value === 'symbol';

    const othIsDefined = other !== undefined;
    const othIsNull = other === null;
    const othIsReflexive = other === other;
    const othIsSymbol = typeof other === 'symbol';

    const bothStrings = typeof value === 'string' && typeof other === 'string';
    const isGreater = bothStrings
      ? collator.compare(value as string, other as string) > 0
      : (value as never) > (other as never);
    const isLess = bothStrings
      ? collator.compare(value as string, other as string) < 0
      : (value as never) < (other as never);

    if (
      (!othIsNull && !othIsSymbol && !valIsSymbol && isGreater) ||
      (valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol) ||
      (valIsNull && othIsDefined && othIsReflexive) ||
      (!valIsDefined && othIsReflexive) ||
      !valIsReflexive
    ) {
      return 1;
    }
    if (
      (!valIsNull && !valIsSymbol && !othIsSymbol && isLess) ||
      (othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol) ||
      (othIsNull && valIsDefined && valIsReflexive) ||
      (!othIsDefined && valIsReflexive) ||
      !othIsReflexive
    ) {
      return -1;
    }
  }
  return 0;
}

function compareMultiple(
  objCriteria: unknown[],
  objIndex: number,
  othCriteria: unknown[],
  othIndex: number,
  orders: Order[],
): number {
  const length = objCriteria.length;
  for (let index = 0; index < length; index += 1) {
    const result = compareAscendingNatural(objCriteria[index], othCriteria[index]);
    if (result) {
      const order = orders[index];
      return result * (order === 'desc' ? -1 : 1);
    }
  }
  // Stable-sort fallback, same as lodash's `compareMultiple`.
  return objIndex - othIndex;
}

export function naturalOrderBy<T>(
  collection: readonly T[],
  iteratees: Iteratee<T> | Iteratee<T>[],
  orders: Order | Order[],
): T[] {
  const keys = Array.isArray(iteratees) ? iteratees : [iteratees];
  const ords = Array.isArray(orders) ? orders : [orders];

  const indexed = collection.map((value, index) => ({
    value,
    index,
    criteria: keys.map(key => (typeof key === 'function' ? key(value) : get(value, key))),
  }));

  indexed.sort((a, b) => compareMultiple(a.criteria, a.index, b.criteria, b.index, ords));

  return indexed.map(item => item.value);
}
