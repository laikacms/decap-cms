import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import AssetProxy from '@/core/valueObjects/AssetProxy';
import { tomlFormatter } from '@/entry-codecs/toml/index';

describe('tomlFormatter', () => {
  it('should output TOML integer values without decimals', () => {
    expect(tomlFormatter.toFile({ testFloat: 123.456, testInteger: 789, title: 'TOML' })).toEqual(
      ['testFloat = 123.456', 'testInteger = 789', 'title = "TOML"'].join('\n'),
    );
  });

  it('should sort keys', () => {
    expect(tomlFormatter.toFile({ a: 'a', b: 'b', c: 'c', d: 'd' }, ['d', 'b', 'a', 'c'])).toEqual(
      ['d = "d"', 'b = "b"', 'a = "a"', 'c = "c"'].join('\n'),
    );
    expect(tomlFormatter.toFile({ a: 'a', b: 'b', c: 'c', d: 'd' }, ['d', 'b', 'c'])).toEqual(
      ['a = "a"', 'd = "d"', 'b = "b"', 'c = "c"'].join('\n'),
    );
  });

  it('should sort keys in nested tables', () => {
    expect(
      tomlFormatter.toFile({ table: { a: 'a', title: 'nested' }, title: 'TOML' }, ['title', 'table', 'a']),
    ).toEqual(['title = "TOML"', '', '[table]', 'title = "nested"', 'a = "a"'].join('\n'));
  });

  it('should replace dayjs values with their formatted value', () => {
    const date = Object.assign(dayjs('2020-04-02'), { _f: 'YYYY-MM-DD' });
    expect(tomlFormatter.toFile({ date, title: 'TOML' })).toEqual(
      ['date = "2020-04-02"', 'title = "TOML"'].join('\n'),
    );
  });

  it('should replace AssetProxy values with their path', () => {
    const asset = new AssetProxy({ path: 'media/image.png', url: 'blob:abc' });
    expect(tomlFormatter.toFile({ image: asset, title: 'TOML' })).toEqual(
      ['image = "media/image.png"', 'title = "TOML"'].join('\n'),
    );
  });
});
