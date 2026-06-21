import { validateMinMax } from '../validations';

function t() {
  return 'error';
}

describe('validateMinMax', () => {
  it('returns rangeMin for empty list when only min is set', () => {
    const result = validateMinMax(t, 'field', [], 2, undefined);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for empty list when only max is set', () => {
    const result = validateMinMax(t, 'field', [], undefined, 3);
    expect(result).toBeUndefined();
  });

  it('returns rangeCount for empty list when both min and max are set and min > 0', () => {
    const result = validateMinMax(t, 'field', [], 1, 3);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns rangeMin for 1-item list when min=2 and no max', () => {
    const result = validateMinMax(t, 'field', [1], 2, undefined);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for 1-item list when max=1', () => {
    const result = validateMinMax(t, 'field', [1], undefined, 1);
    expect(result).toBeUndefined();
  });

  it('returns rangeMax for 2-item list when max=1', () => {
    const result = validateMinMax(t, 'field', [1, 2], undefined, 1);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns rangeCountExact error when min === max and value size is out of range', () => {
    const result = validateMinMax(t, 'field', [1, 2], 1, 1);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for 1-item list when min=1 and max=1 (rangeCountExact boundary)', () => {
    const result = validateMinMax(t, 'field', [1], 1, 1);
    expect(result).toBeUndefined();
  });

  it('returns no error when value is within min and max range', () => {
    const result = validateMinMax(t, 'field', [1, 2], 1, 3);
    expect(result).toBeUndefined();
  });

  it('returns no error when neither min nor max is set', () => {
    const result = validateMinMax(t, 'field', [1, 2, 3], undefined, undefined);
    expect(result).toBeUndefined();
  });
});
