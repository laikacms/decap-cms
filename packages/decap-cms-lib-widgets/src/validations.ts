import isNumber from 'lodash/isNumber';

/**
 * Validates a collection-like value's size against optional `min`/`max` bounds.
 *
 * `min` and `max` are independently optional — neither requires the other to be
 * set. Passing only `min` enforces a lower bound (`rangeMin`), passing only `max`
 * enforces an upper bound (`rangeMax`), and passing both enforces a range
 * (`rangeCount`/`rangeCountExact`). This differs from the relation widget, whose
 * `min`/`max` options are gated behind `multiple: true`.
 *
 * DCMS-283: decapcms.org's List Widget docs previously claimed `min` and `max`
 * require each other; that claim does not match this implementation and should
 * not be reintroduced.
 */
export function validateMinMax(
  t: (key: string, options: unknown) => string,
  fieldLabel: string,
  value?: unknown[] | { length: number } | { size: number },
  min?: number,
  max?: number,
) {
  const size =
    value != null
      ? Array.isArray(value)
        ? value.length
        : typeof (value as { size?: number }).size === 'number'
        ? (value as { size: number }).size
        : (value as { length: number }).length
      : undefined;

  function minMaxError(messageKey: string) {
    return {
      type: 'RANGE',
      message: t(`editor.editorControlPane.widget.${messageKey}`, {
        fieldLabel,
        minCount: min,
        maxCount: max,
        count: min,
      }),
    };
  }

  if ([min, max, size].every(isNumber) && (size! < min! || size! > max!)) {
    return minMaxError(min === max ? 'rangeCountExact' : 'rangeCount');
  } else if (isNumber(min) && min > 0 && isNumber(size) && size! < min) {
    return minMaxError('rangeMin');
  } else if (isNumber(max) && isNumber(size) && size! > max) {
    return minMaxError('rangeMax');
  }
}
