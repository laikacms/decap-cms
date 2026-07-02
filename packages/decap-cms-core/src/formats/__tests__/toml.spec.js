import dayjs from 'dayjs';

import AssetProxy from '../../valueObjects/AssetProxy';
import tomlFormatter from '../toml';

describe('tomlFormatter', () => {
  it('should output TOML integer values without decimals', () => {
    expect(tomlFormatter.toFile({ testFloat: 123.456, testInteger: 789, title: 'TOML' })).toEqual(
      ['testFloat = 123.456', 'testInteger = 789', 'title = "TOML"'].join('\n'),
    );
  });

  describe('fromFile', () => {
    it('should parse string values', () => {
      expect(tomlFormatter.fromFile('title = "TOML Example"')).toEqual({
        title: 'TOML Example',
      });
    });

    it('should parse integer values', () => {
      expect(tomlFormatter.fromFile('count = 42')).toEqual({ count: 42 });
    });

    it('should parse float values', () => {
      expect(tomlFormatter.fromFile('pi = 3.14')).toEqual({ pi: 3.14 });
    });

    it('should parse nested objects', () => {
      expect(tomlFormatter.fromFile('[owner]\nname = "Tom"\n')).toEqual({
        owner: { name: 'Tom' },
      });
    });
  });

  describe('toFile', () => {
    it('should output AssetProxy values as their path', () => {
      const asset = new AssetProxy({ path: 'a.png' });
      expect(tomlFormatter.toFile({ img: asset })).toEqual('img = a.png');
    });

    it('should format dayjs values using the format stored on `_f`', () => {
      const date = dayjs('2020-01-15');
      Object.assign(date, { _f: 'YYYY-MM-DD' });
      expect(tomlFormatter.toFile({ date })).toEqual('date = 2020-01-15');
    });

    it('should order output keys according to sortedKeys', () => {
      expect(tomlFormatter.toFile({ b: 1, a: 2, c: 3 }, ['c', 'a', 'b'])).toEqual(
        ['c = 3', 'a = 2', 'b = 1'].join('\n'),
      );
    });
  });
});
