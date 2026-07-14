import { describe, expect, it } from 'vitest';

import tomlFormatter from '@/core/formats/toml';

describe('tomlFormatter', () => {
  it('should output TOML integer values without decimals', () => {
    expect(tomlFormatter.toFile({ testFloat: 123.456, testInteger: 789, title: 'TOML' })).toEqual(
      ['testFloat = 123.456', 'testInteger = 789', 'title = "TOML"'].join('\n'),
    );
  });
});
