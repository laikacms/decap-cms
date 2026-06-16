import isNumber from 'lodash/isNumber';

export function validateMinMax(
  t: (key: string, options: unknown) => string,
  fieldLabel: string,
  value?: unknown[] | { length: number },
  min?: number,
  max?: number,
) {
  const size =
    value != null
      ? Array.isArray(value)
        ? value.length
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
