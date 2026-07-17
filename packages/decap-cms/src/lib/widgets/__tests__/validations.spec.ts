import { describe, expect, it } from 'vitest';

import { validateMinMax } from '@/lib/widgets/validations';

const t = (key: string) => key;

describe('validateMinMax', () => {
  it('returns rangeMin for an empty list when only min is set (DCMS-657)', () => {
    const error = validateMinMax(t, 'items', [], 2, undefined);
    expect(error).toBeDefined();
    expect(error?.message).toContain('rangeMin');
  });

  it('returns rangeMax for an over-length list when only max is set', () => {
    const error = validateMinMax(t, 'items', [1, 2, 3], undefined, 2);
    expect(error).toBeDefined();
    expect(error?.message).toContain('rangeMax');
  });

  it('returns no error when only min is set and the list satisfies it', () => {
    const error = validateMinMax(t, 'items', [1, 2], 2, undefined);
    expect(error).toBeUndefined();
  });
});
