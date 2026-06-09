import { fromJS } from 'immutable';

import { encodeEntry } from '../stega';

import type { List, Map as ImmutableMap } from 'immutable';

// @vercel/stega encodes data as zero-width unicode characters appended to the string.
// We detect encoding by checking that the output is longer than the input.
function isEncoded(output: string, input: string): boolean {
  return output.startsWith(input) && output.length > input.length;
}

function makeFields(fieldDefs: object[]) {
  return fromJS(fieldDefs) as List<ImmutableMap<string, unknown>>;
}

describe('encodeEntry', () => {
  describe('string widget', () => {
    it('appends stega suffix to string value', () => {
      const fields = makeFields([{ name: 'title', widget: 'string' }]);
      const entry = fromJS({ title: 'Hello world' });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const encoded = result.get('title') as string;
      expect(isEncoded(encoded, 'Hello world')).toBe(true);
    });
  });

  describe('text widget', () => {
    it('appends stega suffix to text value', () => {
      const fields = makeFields([{ name: 'body', widget: 'text' }]);
      const entry = fromJS({ body: 'Some text content' });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const encoded = result.get('body') as string;
      expect(isEncoded(encoded, 'Some text content')).toBe(true);
    });
  });

  describe('markdown widget', () => {
    it('encodes each non-empty paragraph separately', () => {
      const fields = makeFields([{ name: 'content', widget: 'markdown' }]);
      const markdown = 'First paragraph\n\nSecond paragraph';
      const entry = fromJS({ content: markdown });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const encoded = result.get('content') as string;
      // Both paragraphs should have stega appended; split on double newline to check
      const parts = encoded.split(/\n\n+/);
      expect(parts).toHaveLength(2);
      expect(isEncoded(parts[0], 'First paragraph')).toBe(true);
      expect(isEncoded(parts[1], 'Second paragraph')).toBe(true);
    });

    it('does not encode empty paragraph separators', () => {
      const fields = makeFields([{ name: 'content', widget: 'markdown' }]);
      const markdown = 'Para one\n\nPara two';
      const entry = fromJS({ content: markdown });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const encoded = result.get('content') as string;
      // The double-newline separator block should be unchanged (no stega on whitespace-only blocks)
      expect(encoded).toContain('\n\n');
    });
  });

  describe('visualEditing: false', () => {
    it('skips encoding for string widget with visualEditing false', () => {
      const fields = makeFields([{ name: 'title', widget: 'string', visualEditing: false }]);
      const entry = fromJS({ title: 'No encoding here' });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      expect(result.get('title')).toBe('No encoding here');
    });

    it('skips encoding for text widget with visualEditing false', () => {
      const fields = makeFields([{ name: 'body', widget: 'text', visualEditing: false }]);
      const entry = fromJS({ body: 'Plain text' });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      expect(result.get('body')).toBe('Plain text');
    });
  });

  describe('unknown widget type', () => {
    it('passes through value unmodified for unrecognised widget', () => {
      const fields = makeFields([{ name: 'meta', widget: 'unknown-widget' }]);
      const entry = fromJS({ meta: 'raw value' });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      expect(result.get('meta')).toBe('raw value');
    });
  });

  describe('nested map fields', () => {
    it('recurses into object fields', () => {
      const fields = makeFields([
        {
          name: 'author',
          widget: 'object',
          fields: [{ name: 'name', widget: 'string' }],
        },
      ]);
      const entry = fromJS({ author: { name: 'Alice' } });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const author = result.get('author') as ImmutableMap<string, unknown>;
      const name = author.get('name') as string;
      expect(isEncoded(name, 'Alice')).toBe(true);
    });
  });

  describe('list items', () => {
    it('recurses into list items', () => {
      const fields = makeFields([
        {
          name: 'tags',
          widget: 'list',
          field: { name: 'tag', widget: 'string' },
        },
      ]);
      const entry = fromJS({ tags: ['alpha', 'beta'] });
      const result = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const tags = result.get('tags') as List<string>;
      expect(isEncoded(tags.get(0) as string, 'alpha')).toBe(true);
      expect(isEncoded(tags.get(1) as string, 'beta')).toBe(true);
    });
  });

  describe('encoding cache', () => {
    it('returns the same reference when value is unchanged on second call', () => {
      const fields = makeFields([{ name: 'title', widget: 'string' }]);
      // First call: encodes and stores in cache
      const entry = fromJS({ title: 'Cached value' });
      const first = encodeEntry(entry, fields) as ImmutableMap<string, unknown>;
      const firstTitle = first.get('title');

      // Second call with the already-encoded string as the new value — cache should return it as-is
      const entry2 = fromJS({ title: firstTitle });
      const second = encodeEntry(entry2, fields) as ImmutableMap<string, unknown>;
      // The map values at the 'title' path should be identical (same reference)
      expect(second.get('title')).toBe(firstTitle);
    });
  });
});
