import { fromJS } from 'immutable';

import { validateMinMax } from '../validations';

function t() {
  return 'error';
}

describe('validateMinMax', () => {
  it('returns rangeMin for empty list when only min is set', () => {
    const result = validateMinMax(t, 'field', fromJS([]), 2, undefined);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for empty list when only max is set', () => {
    const result = validateMinMax(t, 'field', fromJS([]), undefined, 3);
    expect(result).toBeUndefined();
  });

  it('returns rangeCount for empty list when both min and max are set and min > 0', () => {
    const result = validateMinMax(t, 'field', fromJS([]), 1, 3);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns rangeMin for 1-item list when min=2 and no max', () => {
    const result = validateMinMax(t, 'field', fromJS([1]), 2, undefined);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for 1-item list when max=1', () => {
    const result = validateMinMax(t, 'field', fromJS([1]), undefined, 1);
    expect(result).toBeUndefined();
  });

  it('returns rangeMax for 2-item list when max=1', () => {
    const result = validateMinMax(t, 'field', fromJS([1, 2]), undefined, 1);
    expect(result).toBeDefined();
    expect(result.type).toBe('RANGE');
  });

  it('returns no error for 1-item list when min=1 and max=1 (rangeCountExact boundary)', () => {
    const result = validateMinMax(t, 'field', fromJS([1]), 1, 1);
    expect(result).toBeUndefined();
  });
});
