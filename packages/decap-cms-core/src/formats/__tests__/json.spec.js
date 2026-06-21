import json from '../json';

describe('json', () => {
  describe('fromFile', () => {
    test('returns parsed object for valid JSON input', () => {
      expect(json.fromFile('{"title":"hello","count":1}')).toEqual({ title: 'hello', count: 1 });
    });

    test('returns parsed array for valid JSON array input', () => {
      expect(json.fromFile('[1,2,3]')).toEqual([1, 2, 3]);
    });

    test('throws SyntaxError for malformed JSON', () => {
      expect(() => json.fromFile('{invalid}')).toThrow(SyntaxError);
    });

    test('throws SyntaxError for empty string', () => {
      expect(() => json.fromFile('')).toThrow(SyntaxError);
    });
  });

  describe('toFile', () => {
    test('returns indented JSON with 2-space indentation', () => {
      const data = { title: 'hello', count: 1 };
      expect(json.toFile(data)).toEqual(JSON.stringify(data, null, 2));
    });

    test('round-trips through fromFile for object with nested keys and array values', () => {
      const data = {
        title: 'test',
        nested: {
          key: 'value',
          list: ['a', 'b', 'c'],
        },
      };
      expect(json.fromFile(json.toFile(data))).toEqual(data);
    });
  });
});
