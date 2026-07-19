import { describe, expect, it } from 'vitest';

import { jsonEntryCodec, jsonFormatter, jsonFrontmatterCodec } from '@/entry-codecs/json/index';

describe('jsonEntryCodec', () => {
  it('registers json as its name and file extension', () => {
    expect(jsonEntryCodec.name).toEqual('json');
    expect(jsonEntryCodec.fileExtensions).toEqual(['json']);
    expect(jsonEntryCodec.defaultExtension).toEqual('json');
    expect(jsonEntryCodec.formatter).toBe(jsonFormatter);
  });
});

describe('jsonFormatter', () => {
  describe('fromFile', () => {
    it('parses a plain JSON object', () => {
      expect(jsonFormatter.fromFile('{"title": "Hello", "count": 1}')).toEqual({
        title: 'Hello',
        count: 1,
      });
    });

    it('parses nested structures', () => {
      expect(
        jsonFormatter.fromFile('{"title": "Hello", "nested": {"inside": [1, 2, 3]}}'),
      ).toEqual({
        title: 'Hello',
        nested: { inside: [1, 2, 3] },
      });
    });

    it('parses a top-level array', () => {
      expect(jsonFormatter.fromFile('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('parses an empty object', () => {
      expect(jsonFormatter.fromFile('{}')).toEqual({});
    });

    it('throws on malformed JSON', () => {
      expect(() => jsonFormatter.fromFile('{not valid json')).toThrow(SyntaxError);
    });
  });

  describe('toFile', () => {
    it('stringifies an object with 2-space indentation', () => {
      expect(jsonFormatter.toFile({ title: 'Hello', count: 1 })).toEqual(
        ['{', '  "title": "Hello",', '  "count": 1', '}'].join('\n'),
      );
    });

    it('stringifies nested structures', () => {
      expect(jsonFormatter.toFile({ nested: { a: 1, b: [1, 2] } })).toEqual(
        [
          '{',
          '  "nested": {',
          '    "a": 1,',
          '    "b": [',
          '      1,',
          '      2',
          '    ]',
          '  }',
          '}',
        ].join('\n'),
      );
    });

    it('stringifies an empty object', () => {
      expect(jsonFormatter.toFile({})).toEqual('{}');
    });
  });

  it('round-trips fromFile(toFile(x)) back to the original value', () => {
    const data = { title: 'Round trip', tags: ['a', 'b'], nested: { flag: true, n: 42 } };
    expect(jsonFormatter.fromFile(jsonFormatter.toFile(data))).toEqual(data);
  });
});

describe('jsonFrontmatterCodec', () => {
  describe('parse', () => {
    it('parses input that already includes the outer braces', () => {
      expect(jsonFrontmatterCodec.parse('{"title": "Yes", "count": 1}')).toEqual({
        title: 'Yes',
        count: 1,
      });
    });

    it('re-adds leading/trailing braces when they were trimmed off', () => {
      expect(jsonFrontmatterCodec.parse('"title": "No braces", "count": 2')).toEqual({
        title: 'No braces',
        count: 2,
      });
    });

    it('re-adds braces around multiline brace-trimmed input', () => {
      expect(
        jsonFrontmatterCodec.parse('"title": "Multiline",\n  "nested": {\n    "a": 1\n  }'),
      ).toEqual({
        title: 'Multiline',
        nested: { a: 1 },
      });
    });

    it('trims surrounding whitespace before inspecting the leading brace', () => {
      expect(jsonFrontmatterCodec.parse('\n\n  {"title": "Padded"}  \n\n')).toEqual({
        title: 'Padded',
      });
    });

    it('parses an empty brace-included object', () => {
      expect(jsonFrontmatterCodec.parse('{}')).toEqual({});
    });

    it('throws on malformed JSON even after re-adding braces', () => {
      expect(() => jsonFrontmatterCodec.parse('"title": ')).toThrow(SyntaxError);
    });
  });

  describe('stringify', () => {
    it('strips the outer braces from the formatted output', () => {
      const result = jsonFrontmatterCodec.stringify({ title: 'Hello', count: 1 });
      expect(result.startsWith('{')).toBe(false);
      expect(result.endsWith('}')).toBe(false);
      expect(result).toEqual(['"title": "Hello",', '  "count": 1'].join('\n'));
    });

    it('strips the leftover leading newline/indent and trailing newline/indent', () => {
      const result = jsonFrontmatterCodec.stringify({
        tags: ['front matter', 'json'],
        title: 'JSON',
      });
      expect(result).toEqual(
        ['"tags": [', '    "front matter",', '    "json"', '  ],', '  "title": "JSON"'].join(
          '\n',
        ),
      );
    });

    it('stringifies an empty object to an empty string', () => {
      expect(jsonFrontmatterCodec.stringify({})).toEqual('');
    });

    it('preserves nested structures in the stripped body', () => {
      const result = jsonFrontmatterCodec.stringify({ nested: { a: 1, b: [1, 2] } });
      expect(result).toEqual(
        ['"nested": {', '    "a": 1,', '    "b": [', '      1,', '      2', '    ]', '  }'].join(
          '\n',
        ),
      );
    });
  });

  it('round-trips parse(stringify(x)) back to the original metadata', () => {
    const metadata = {
      title: 'Round trip',
      tags: ['front matter', 'json'],
      nested: { flag: true, n: 42, list: [1, 2, 3] },
    };
    expect(jsonFrontmatterCodec.parse(jsonFrontmatterCodec.stringify(metadata))).toEqual(
      metadata,
    );
  });

  it('round-trips an empty object through stringify/parse via the brace-trimmed path', () => {
    const stringified = jsonFrontmatterCodec.stringify({});
    // The trimmed empty body isn't valid JSON on its own; the re-add-braces
    // fallback in parse() turns it into a valid, empty object.
    expect(jsonFrontmatterCodec.parse(stringified)).toEqual({});
  });
});
