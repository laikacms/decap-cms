import { validateMinMax } from '../validations';

describe('validateMinMax', () => {
  const t = (key, options) => JSON.stringify({ key, options });
  const fieldLabel = 'Categories';

  it('should return undefined when value is within min and max bounds', () => {
    expect(validateMinMax(t, fieldLabel, ['a', 'b'], 1, 3)).toBeUndefined();
  });

  it('should return undefined when no bounds are provided', () => {
    expect(validateMinMax(t, fieldLabel, ['a'])).toBeUndefined();
  });

  it('should return undefined when value is undefined', () => {
    expect(validateMinMax(t, fieldLabel, undefined, 1, 3)).toBeUndefined();
  });

  describe('rangeCount / rangeCountExact (both min and max set)', () => {
    it('should return a rangeCount error when value is below min and min !== max', () => {
      const error = validateMinMax(t, fieldLabel, ['a'], 2, 3);

      expect(error).toEqual({
        type: 'RANGE',
        message: t('editor.editorControlPane.widget.rangeCount', {
          fieldLabel,
          minCount: 2,
          maxCount: 3,
          count: 2,
        }),
      });
    });

    it('should return a rangeCount error when value is above max and min !== max', () => {
      const error = validateMinMax(t, fieldLabel, ['a', 'b', 'c', 'd'], 1, 3);

      expect(error).toEqual({
        type: 'RANGE',
        message: t('editor.editorControlPane.widget.rangeCount', {
          fieldLabel,
          minCount: 1,
          maxCount: 3,
          count: 1,
        }),
      });
    });

    it('should return a rangeCountExact error when min === max and value size does not match', () => {
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

    it('should return undefined when min === max and value size matches exactly', () => {
      expect(validateMinMax(t, fieldLabel, ['a', 'b'], 2, 2)).toBeUndefined();
    });
  });

  describe('rangeMin (only min set)', () => {
    it('should return a rangeMin error when value is below min', () => {
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

    it('should not return a rangeMin error when min is 0', () => {
      expect(validateMinMax(t, fieldLabel, [], 0, undefined)).toBeUndefined();
    });

    it('should return undefined when value is at or above min', () => {
      expect(validateMinMax(t, fieldLabel, ['a', 'b'], 2, undefined)).toBeUndefined();
    });
  });

  describe('rangeMax (only max set)', () => {
    it('should return a rangeMax error when value is above max', () => {
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

    it('should return undefined when value is at or below max', () => {
      expect(validateMinMax(t, fieldLabel, ['a'], undefined, 2)).toBeUndefined();
    });
  });

  describe('value shapes', () => {
    it('should size a plain Array by its length', () => {
      const error = validateMinMax(t, fieldLabel, [1, 2, 3], undefined, 2);

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

    it('should size an object with a numeric size property (e.g. an Immutable List)', () => {
      const error = validateMinMax(t, fieldLabel, { size: 5 }, undefined, 2);

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

    it('should fall back to a length property when size is not numeric', () => {
      const error = validateMinMax(t, fieldLabel, { length: 4 }, undefined, 2);

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

    it('should not validate an object with neither a size nor a length property', () => {
      expect(validateMinMax(t, fieldLabel, {}, undefined, 2)).toBeUndefined();
    });
  });
});
