import { describe, expect, it } from 'vitest';

import { serializeValues, deserializeValues } from '@/core/lib/serializeEntryValues';

const values = { title: 'New Post', unknown: 'Unknown Field' };
const fields = [{ name: 'title', widget: 'string' }];

describe('serializeValues', () => {
  it('should retain unknown fields', () => {
    expect(serializeValues(values, fields)).toEqual({
      title: 'New Post',
      unknown: 'Unknown Field',
    });
  });
});

describe('deserializeValues', () => {
  it('should retain unknown fields', () => {
    expect(deserializeValues(values, fields)).toEqual({
      title: 'New Post',
      unknown: 'Unknown Field',
    });
  });
});
