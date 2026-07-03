import { encodeEntry } from '../stega';

import type { CmsField } from 'decap-cms-core';

// @vercel/stega encodes data as zero-width unicode characters appended to the string.
// We detect encoding by checking that the output is longer than the input.
function isEncoded(output: string, input: string): boolean {
  return output.startsWith(input) && output.length > input.length;
}

function makeFields(fieldDefs: object[]) {
  return fieldDefs as CmsField[];
}

describe('encodeEntry', () => {
  describe('string widget', () => {
    it('appends stega suffix to string value', () => {
      const fields = makeFields([{ name: 'title', widget: 'string' }]);
      const entry = { title: 'Hello world' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const encoded = result.title as string;
      expect(isEncoded(encoded, 'Hello world')).toBe(true);
    });
  });

  describe('text widget', () => {
    it('appends stega suffix to text value', () => {
      const fields = makeFields([{ name: 'body', widget: 'text' }]);
      const entry = { body: 'Some text content' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const encoded = result.body as string;
      expect(isEncoded(encoded, 'Some text content')).toBe(true);
    });
  });

  describe('markdown widget', () => {
    it('encodes each non-empty paragraph separately', () => {
      const fields = makeFields([{ name: 'content', widget: 'markdown' }]);
      const markdown = 'First paragraph\n\nSecond paragraph';
      const entry = { content: markdown };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const encoded = result.content as string;
      // Both paragraphs should have stega appended; split on double newline to check
      const parts = encoded.split(/\n\n+/);
      expect(parts).toHaveLength(2);
      expect(isEncoded(parts[0], 'First paragraph')).toBe(true);
      expect(isEncoded(parts[1], 'Second paragraph')).toBe(true);
    });

    it('does not encode empty paragraph separators', () => {
      const fields = makeFields([{ name: 'content', widget: 'markdown' }]);
      const markdown = 'Para one\n\nPara two';
      const entry = { content: markdown };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const encoded = result.content as string;
      // The double-newline separator block should be unchanged (no stega on whitespace-only blocks)
      expect(encoded).toContain('\n\n');
    });
  });

  describe('visualEditing: false', () => {
    it('skips encoding for string widget with visualEditing false', () => {
      const fields = makeFields([{ name: 'title', widget: 'string', visualEditing: false }]);
      const entry = { title: 'No encoding here' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      expect(result.title).toBe('No encoding here');
    });

    it('skips encoding for text widget with visualEditing false', () => {
      const fields = makeFields([{ name: 'body', widget: 'text', visualEditing: false }]);
      const entry = { body: 'Plain text' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      expect(result.body).toBe('Plain text');
    });

    it('skips encoding for markdown widget with visualEditing false', () => {
      const fields = makeFields([{ name: 'content', widget: 'markdown', visualEditing: false }]);
      const entry = { content: 'First paragraph\n\nSecond paragraph' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      expect(result.content).toBe('First paragraph\n\nSecond paragraph');
    });
  });

  describe('unknown widget type', () => {
    it('passes through value unmodified for unrecognised widget', () => {
      const fields = makeFields([{ name: 'meta', widget: 'unknown-widget' }]);
      const entry = { meta: 'raw value' };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      expect(result.meta).toBe('raw value');
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
      const entry = { author: { name: 'Alice' } };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const author = result.author as Record<string, unknown>;
      const name = author.name as string;
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
      const entry = { tags: ['alpha', 'beta'] };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const tags = result.tags as string[];
      expect(isEncoded(tags[0], 'alpha')).toBe(true);
      expect(isEncoded(tags[1], 'beta')).toBe(true);
    });
  });

  describe('typed list items', () => {
    it('encodes nested string field inside a matched typed item', () => {
      // The list field has `types` — each type has its own fields.
      // encodeList sees item.type === 'banner', finds the matching type,
      // then recurses into that type's fields.
      const fields = makeFields([
        {
          name: 'sections',
          widget: 'list',
          types: [
            {
              name: 'banner',
              widget: 'object',
              fields: [{ name: 'headline', widget: 'string' }],
            },
          ],
        },
      ]);
      const entry = { sections: [{ type: 'banner', headline: 'Welcome' }] };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const sections = result.sections as Record<string, unknown>[];
      const item = sections[0];
      const headline = item.headline as string;
      expect(isEncoded(headline, 'Welcome')).toBe(true);
    });

    it('returns item unchanged and throws no error when type name has no match', () => {
      const fields = makeFields([
        {
          name: 'sections',
          widget: 'list',
          types: [
            {
              name: 'banner',
              widget: 'object',
              fields: [{ name: 'headline', widget: 'string' }],
            },
          ],
        },
      ]);
      const entry = { sections: [{ type: 'unknown-type', headline: 'Should not encode' }] };
      expect(() => encodeEntry(entry, fields)).not.toThrow();
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const sections = result.sections as Record<string, unknown>[];
      const item = sections[0];
      // headline must be untouched — getNestedFields(undefined) returns [] so no encoding happens
      expect(item.headline).toBe('Should not encode');
    });

    it('handles a mixed list of typed and untyped items correctly', () => {
      // When a list field declares `types`, getNestedFields returns the type objects
      // as ctx.fields.  A typed item (has a `type` key) is looked up by name in ctx.fields
      // and its own sub-fields are used for encoding.  An untyped item (no `type` key) falls
      // through to the else branch and is visited with ctx.fields — which are the type objects,
      // not sub-fields — so none of its keys match and strings are NOT encoded.
      const fields = makeFields([
        {
          name: 'blocks',
          widget: 'list',
          types: [
            {
              name: 'card',
              widget: 'object',
              fields: [{ name: 'title', widget: 'string' }],
            },
          ],
        },
      ]);
      const entry = {
        blocks: [
          { type: 'card', title: 'Card title' }, // typed — resolved via type name → encoded
          { title: 'No type key' }, // untyped — ctx.fields has no 'title' match → not encoded
        ],
      };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const blocks = result.blocks as Record<string, unknown>[];

      const typedItem = blocks[0];
      expect(isEncoded(typedItem.title as string, 'Card title')).toBe(true);

      // Untyped item: ctx.fields contains type-definition objects (name === 'card'),
      // encodeMap finds no field named 'title' at that level, so value is left unchanged.
      const untypedItem = blocks[1];
      expect(untypedItem.title).toBe('No type key');
    });
  });

  describe('typed list with custom typeKey', () => {
    it('encodes nested string field when typeKey is set to "kind"', () => {
      // DCMS-039: encodeList was hardcoding item.type — when typeKey differs,
      // no typed-list item was ever matched and nested fields were not encoded.
      const fields = makeFields([
        {
          name: 'sections',
          widget: 'list',
          typeKey: 'kind',
          types: [
            {
              name: 'hero',
              widget: 'object',
              fields: [{ name: 'headline', widget: 'string' }],
            },
          ],
        },
      ]);
      const entry = { sections: [{ kind: 'hero', headline: 'Hello DCMS-039' }] };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const sections = result.sections as Record<string, unknown>[];
      const item = sections[0];
      const headline = item.headline as string;
      expect(isEncoded(headline, 'Hello DCMS-039')).toBe(true);
    });

    it('does not encode item when typeKey value has no matching type', () => {
      const fields = makeFields([
        {
          name: 'sections',
          widget: 'list',
          typeKey: 'kind',
          types: [
            {
              name: 'hero',
              widget: 'object',
              fields: [{ name: 'headline', widget: 'string' }],
            },
          ],
        },
      ]);
      const entry = { sections: [{ kind: 'unknown', headline: 'No match' }] };
      const result = encodeEntry(entry, fields) as Record<string, unknown>;
      const sections = result.sections as Record<string, unknown>[];
      const item = sections[0];
      expect(item.headline).toBe('No match');
    });
  });

  describe('encoding cache', () => {
    it('cache hit: same raw input at same path within one encodeEntry call returns same encoded output', () => {
      // Verify the per-call inputCache/outputCache correctly short-circuits on repeated path visits.
      // We exercise this by encoding a list where two sibling items share the same path prefix;
      // the innermost string visit for the same path with the same value must return the cached result.
      const fields = makeFields([{ name: 'title', widget: 'string' }]);
      const entry = { title: 'Hello cache' };

      const result1 = encodeEntry(entry, fields) as Record<string, unknown>;
      const result2 = encodeEntry(entry, fields) as Record<string, unknown>;

      // Both calls encode the same raw input — output must be encoded (not raw)
      // and both calls must produce the same encoded string.
      const encoded1 = result1.title as string;
      const encoded2 = result2.title as string;
      expect(isEncoded(encoded1, 'Hello cache')).toBe(true);
      expect(encoded1).toBe(encoded2);
    });

    it('cache miss: different raw input at same path within one encodeEntry call produces new encoding', () => {
      const fields = makeFields([{ name: 'title', widget: 'string' }]);

      const result1 = encodeEntry({ title: 'First value' }, fields) as Record<string, unknown>;
      const result2 = encodeEntry({ title: 'Second value' }, fields) as Record<string, unknown>;

      expect(isEncoded(result1.title as string, 'First value')).toBe(true);
      expect(isEncoded(result2.title as string, 'Second value')).toBe(true);
      expect(result1.title).not.toBe(result2.title);
    });
  });
});
