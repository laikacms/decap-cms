import { validateMinMax } from '../validations';

function t(key: string, options: unknown) {
  return `${key}:${JSON.stringify(options)}`;
}

describe('validateMinMax', () => {
  const fieldLabel = 'Tags';

  it('returns a RANGE error with rangeCountExact when min === max and size is out of range', () => {
    const error = validateMinMax(t, fieldLabel, ['a'], 2, 2);
    expect(error).toEqual({
      type: 'RANGE',
      message: t('editor.editorControlPane.widget.rangeCountExact', {
        fieldLabel,
        minCount: 2,
        maxCount: 2,
        count: 2,
      }),
    });
  });

  it('returns a RANGE error with rangeMin when only min is set and size is below it', () => {
    const error = validateMinMax(t, fieldLabel, ['a'], 2, undefined);
    expect(error).toEqual({
      type: 'RANGE',
      message: t('editor.editorControlPane.widget.rangeMin', {
        fieldLabel,
        minCount: 2,
        maxCount: undefined,
        count: 2,
      }),
    });
  });

  it('returns a RANGE error with rangeMax when only max is set and size exceeds it', () => {
    const error = validateMinMax(t, fieldLabel, ['a', 'b', 'c'], undefined, 2);
    expect(error).toEqual({
      type: 'RANGE',
      message: t('editor.editorControlPane.widget.rangeMax', {
        fieldLabel,
        minCount: undefined,
        maxCount: 2,
        count: undefined,
      }),
    });
  });

  it('returns undefined when only min is set and value is undefined (no list rendered yet)', () => {
    const error = validateMinMax(t, fieldLabel, undefined, 1, undefined);
    expect(error).toBeUndefined();
  });

  it('returns a RANGE error when only min is set and value is an empty list (DCMS-005 regression)', () => {
    const error = validateMinMax(t, fieldLabel, [], 1, undefined);
    expect(error).toEqual({
      type: 'RANGE',
      message: t('editor.editorControlPane.widget.rangeMin', {
        fieldLabel,
        minCount: 1,
        maxCount: undefined,
        count: 1,
      }),
    });
  });

  it('returns undefined when size is within the min/max range', () => {
    const error = validateMinMax(t, fieldLabel, ['a', 'b'], 1, 3);
    expect(error).toBeUndefined();
  });

  it('returns undefined when no min or max is set', () => {
    const error = validateMinMax(t, fieldLabel, ['a', 'b'], undefined, undefined);
    expect(error).toBeUndefined();
  });
});
