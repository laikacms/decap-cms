import { vercelStegaDecode } from '@vercel/stega';
import { describe, expect, it } from 'vitest';

import { encodeEntry } from '@/core/lib/stega';

import type { CmsField } from '@/lib/util/index';

// `encodeEntry` maintains a module-level cache keyed by path, so give every
// test its own unique root path to avoid cross-test cache pollution.
let pathCounter = 0;
function uniquePath() {
  pathCounter += 1;
  return `t${pathCounter}`;
}

function stringField(overrides: Partial<CmsField> = {}): CmsField {
  return { name: 'title', widget: 'string', ...overrides } as CmsField;
}

function richtextField(overrides: Partial<CmsField> = {}): CmsField {
  return { name: 'body', widget: 'richtext', ...overrides } as CmsField;
}

describe('stega', () => {
  describe('encodeEntry / isPlainObject / getNestedFields (via public API)', () => {
    it('encodes a top-level plain-object entry using the field lookup', () => {
      const fields: CmsField[] = [stringField()];
      const result = encodeEntry({ title: 'hello' }, fields) as Record<string, unknown>;
      expect(vercelStegaDecode(result.title as string)).toEqual({ decap: 'title' });
    });

    it('does not encode a Date value even when it is object-shaped', () => {
      const fields: CmsField[] = [{ name: 'when', widget: 'datetime' } as CmsField];
      const date = new Date('2020-01-01T00:00:00.000Z');
      const result = encodeEntry({ when: date }, fields) as Record<string, unknown>;
      // Date is not a plain object, so encodeMap's isPlainObject(value) branch
      // during traversal never treats it as a nested map; encodeMap only
      // recurses into it via visit(), and visit's own isPlainObject check on
      // the Date itself must reject it and return it untouched.
      expect(result.when).toBe(date);
    });

    it('handles a null value without throwing', () => {
      const fields: CmsField[] = [stringField()];
      const result = encodeEntry({ title: null }, fields) as Record<string, unknown>;
      expect(result.title).toBeNull();
    });

    it('treats an Object.create(null) value as a plain object and traverses into it', () => {
      const fields: CmsField[] = [
        {
          name: 'author',
          widget: 'object',
          fields: [stringField({ name: 'name' })],
        } as CmsField,
      ];
      const nullProtoAuthor = Object.create(null) as Record<string, unknown>;
      nullProtoAuthor.name = 'Ada';
      const result = encodeEntry({ author: nullProtoAuthor }, fields) as Record<
        string,
        Record<string, unknown>
      >;
      expect(vercelStegaDecode(result.author.name as string)).toEqual({
        decap: 'author.name',
      });
    });

    it('encodes an array passed as the top-level entry value via encodeList, not encodeMap', () => {
      const fields: CmsField[] = [stringField({ name: 'ignored' })];
      const result = encodeEntry(['a', 'b'], fields) as string[];
      expect(vercelStegaDecode(result[0])).toEqual({ decap: '.0' });
      expect(vercelStegaDecode(result[1])).toEqual({ decap: '.1' });
    });

    it('encodes an object-widget field via getNestedFields "fields" branch', () => {
      const fields: CmsField[] = [
        {
          name: 'author',
          widget: 'object',
          fields: [stringField({ name: 'name' })],
        } as CmsField,
      ];
      const result = encodeEntry({ author: { name: 'Ada' } }, fields) as Record<
        string,
        Record<string, unknown>
      >;
      expect(vercelStegaDecode(result.author.name as string)).toEqual({
        decap: 'author.name',
      });
    });

    it('encodes a list-widget field with a single sub-field via getNestedFields "field" branch', () => {
      const fields: CmsField[] = [
        {
          name: 'tags',
          widget: 'list',
          field: stringField({ name: 'tag' }),
        } as CmsField,
      ];
      const result = encodeEntry({ tags: ['a', 'b'] }, fields) as Record<string, string[]>;
      expect(vercelStegaDecode(result.tags[0])).toEqual({ decap: 'tags.0' });
      expect(vercelStegaDecode(result.tags[1])).toEqual({ decap: 'tags.1' });
    });

    it('encodes a typed-list field via getNestedFields "types" branch', () => {
      const fields: CmsField[] = [
        {
          name: 'blocks',
          widget: 'list',
          types: [
            {
              name: 'text-block',
              widget: 'object',
              fields: [stringField({ name: 'content' })],
            },
          ],
        } as CmsField,
      ];
      const result = encodeEntry(
        { blocks: [{ type: 'text-block', content: 'hi' }] },
        fields,
      ) as Record<string, Array<Record<string, unknown>>>;
      expect(vercelStegaDecode(result.blocks[0].content as string)).toEqual({
        decap: 'blocks.0.content',
      });
    });

    it('leaves a bare field (no types/fields/field) as a single-element nested field list', () => {
      // `hidden` widget with no nested shape falls through getNestedFields'
      // final `return [f]` branch, so its own definition is reused as the
      // field for the value it wraps.
      const fields: CmsField[] = [{ name: 'flag', widget: 'hidden' } as CmsField];
      const result = encodeEntry({ flag: 'x' }, fields) as Record<string, unknown>;
      // 'hidden' widget doesn't match 'string'/'text'/'richtext' in encodeString,
      // so the value passes through unchanged.
      expect(result.flag).toBe('x');
    });
  });

  describe('encodeString', () => {
    it('appends steganographic data for a string widget', () => {
      const path = uniquePath();
      const encoded = encodeEntry('hello', [stringField()]) as string;
      // encodeEntry's top-level visit is called with path='' by default;
      // exercise encodeString more directly through encodeMap/encodeList to
      // control the path precisely.
      const fields: CmsField[] = [stringField({ name: path })];
      const result = encodeEntry({ [path]: 'hello' }, fields) as Record<string, string>;
      expect(result[path].startsWith('hello')).toBe(true);
      expect(vercelStegaDecode(result[path])).toEqual({ decap: path });
      expect(encoded.startsWith('hello')).toBe(true);
    });

    it('appends steganographic data for a text widget', () => {
      const path = uniquePath();
      const fields: CmsField[] = [{ name: path, widget: 'text' } as CmsField];
      const result = encodeEntry({ [path]: 'body copy' }, fields) as Record<string, string>;
      expect(vercelStegaDecode(result[path])).toEqual({ decap: path });
    });

    it('honors visualEditing: false to opt a string field out of encoding', () => {
      const path = uniquePath();
      const fields: CmsField[] = [stringField({ name: path, visualEditing: false })];
      const result = encodeEntry({ [path]: 'hello' }, fields) as Record<string, string>;
      expect(result[path]).toBe('hello');
    });

    it('encodes richtext by appending steganographic data to every non-blank paragraph', () => {
      const path = uniquePath();
      const fields: CmsField[] = [richtextField({ name: path })];
      const value = 'first paragraph\n\nsecond paragraph';
      const result = encodeEntry({ [path]: value }, fields) as Record<string, string>;
      const [first, second] = result[path].split(/\n\n+/);
      expect(vercelStegaDecode(first)).toEqual({ decap: path });
      expect(vercelStegaDecode(second)).toEqual({ decap: path });
      expect(first.startsWith('first paragraph')).toBe(true);
      expect(second.startsWith('second paragraph')).toBe(true);
    });

    it('encodes the legacy markdown alias the same as richtext (DCMS-NEW-STEGAMD)', () => {
      const path = uniquePath();
      const fields: CmsField[] = [{ name: path, widget: 'markdown' } as CmsField];
      const value = 'first paragraph\n\nsecond paragraph';
      const result = encodeEntry({ [path]: value }, fields) as Record<string, string>;
      const [first, second] = result[path].split(/\n\n+/);
      expect(vercelStegaDecode(first)).toEqual({ decap: path });
      expect(vercelStegaDecode(second)).toEqual({ decap: path });
      expect(first.startsWith('first paragraph')).toBe(true);
      expect(second.startsWith('second paragraph')).toBe(true);
    });

    it('preserves blank-line separators between richtext paragraphs', () => {
      const path = uniquePath();
      const fields: CmsField[] = [richtextField({ name: path })];
      const value = 'a\n\n\nb';
      const result = encodeEntry({ [path]: value }, fields) as Record<string, string>;
      expect(result[path]).toContain('\n\n\n');
    });

    it('returns the value unchanged when there is no field for the string', () => {
      const path = uniquePath();
      const result = encodeEntry(path, []) as string;
      expect(result).toBe(path);
    });

    it('returns a string unchanged for a widget that is neither string/text nor richtext', () => {
      const path = uniquePath();
      const fields: CmsField[] = [{ name: path, widget: 'boolean' } as CmsField];
      const result = encodeEntry({ [path]: 'unencoded' }, fields) as Record<string, string>;
      expect(result[path]).toBe('unencoded');
    });
  });

  describe('encodeList', () => {
    it('routes typed items to the field matching their "type" key', () => {
      const path = uniquePath();
      const fields: CmsField[] = [
        {
          name: 'quote',
          widget: 'object',
          fields: [stringField({ name: 'text' })],
        } as CmsField,
        {
          name: 'image',
          widget: 'object',
          fields: [stringField({ name: 'caption' })],
        } as CmsField,
      ];
      const listField: CmsField = { name: path, widget: 'list', types: fields } as CmsField;
      const result = encodeEntry(
        { [path]: [{ type: 'quote', text: 'hi' }, { type: 'image', caption: 'cap' }] },
        [listField],
      ) as Record<string, Array<Record<string, unknown>>>;
      expect(vercelStegaDecode(result[path][0].text as string)).toEqual({
        decap: `${path}.0.text`,
      });
      expect(vercelStegaDecode(result[path][1].caption as string)).toEqual({
        decap: `${path}.1.caption`,
      });
    });

    it('routes untyped object items through the current fields', () => {
      const path = uniquePath();
      const listField: CmsField = {
        name: path,
        widget: 'list',
        fields: [stringField({ name: 'label' })],
      } as CmsField;
      const result = encodeEntry(
        { [path]: [{ label: 'one' }, { label: 'two' }] },
        [listField],
      ) as Record<string, Array<Record<string, unknown>>>;
      expect(vercelStegaDecode(result[path][0].label as string)).toEqual({
        decap: `${path}.0.label`,
      });
      expect(vercelStegaDecode(result[path][1].label as string)).toEqual({
        decap: `${path}.1.label`,
      });
    });

    it('routes simple (non-object) items through the list field itself', () => {
      const path = uniquePath();
      const listField: CmsField = {
        name: path,
        widget: 'list',
        field: stringField({ name: 'value' }),
      } as CmsField;
      const result = encodeEntry({ [path]: ['x', 'y'] }, [listField]) as Record<
        string,
        string[]
      >;
      expect(vercelStegaDecode(result[path][0])).toEqual({ decap: `${path}.0` });
      expect(vercelStegaDecode(result[path][1])).toEqual({ decap: `${path}.1` });
    });

    it('leaves a simple item unchanged when there is no field available', () => {
      const path = uniquePath();
      const listField: CmsField = { name: path, widget: 'list' } as CmsField;
      const result = encodeEntry({ [path]: ['x'] }, [listField]) as Record<string, string[]>;
      expect(result[path][0]).toBe('x');
    });
  });

  describe('encodeMap', () => {
    it('looks up the field for each key and recursively encodes it', () => {
      const fields: CmsField[] = [
        stringField({ name: 'title' }),
        stringField({ name: 'subtitle' }),
      ];
      const result = encodeEntry({ title: 'a', subtitle: 'b' }, fields) as Record<
        string,
        string
      >;
      expect(vercelStegaDecode(result.title)).toEqual({ decap: 'title' });
      expect(vercelStegaDecode(result.subtitle)).toEqual({ decap: 'subtitle' });
    });

    it('leaves a key unchanged when no matching field is found', () => {
      const fields: CmsField[] = [stringField({ name: 'title' })];
      const result = encodeEntry({ title: 'a', extra: 'b' }, fields) as Record<string, string>;
      expect(result.extra).toBe('b');
    });

    it('preserves referential equality for keys whose encoded value is unchanged', () => {
      const fields: CmsField[] = [{ name: 'flag', widget: 'boolean' } as CmsField];
      const original = { flag: true };
      const result = encodeEntry(original, fields) as Record<string, unknown>;
      // `boolean` widget never encodes, and true !== the encoded copy check;
      // encodeMap should only overwrite the key when newVal !== val, so this
      // key's value should be the exact same boolean primitive reference.
      expect(result.flag).toBe(original.flag);
    });

    it('returns a new object rather than mutating the input map', () => {
      const fields: CmsField[] = [stringField({ name: 'title' })];
      const original = { title: 'a' };
      const result = encodeEntry(original, fields);
      expect(result).not.toBe(original);
      expect(original.title).toBe('a');
    });
  });

  describe('encodeEntry caching', () => {
    it('returns the identical cached value on a second call with the same value at the same path, without re-invoking the encoder', () => {
      const path = uniquePath();
      const fields: CmsField[] = [stringField({ name: path })];
      const entry = { [path]: 'same value' };

      const first = encodeEntry(entry, fields) as Record<string, string>;
      const encodedFirst = first[path];

      // Re-encode using the exact same nested value reference (unchanged
      // entry object identity at this path) — the cache should short-circuit
      // and return the identical previously-encoded string rather than
      // appending stega data a second time.
      const second = encodeEntry({ [path]: encodedFirst }, fields) as Record<string, string>;
      expect(second[path]).toBe(encodedFirst);
    });

    it('re-encodes when the value at a cached path changes', () => {
      const path = uniquePath();
      const fields: CmsField[] = [stringField({ name: path })];

      const first = encodeEntry({ [path]: 'value one' }, fields) as Record<string, string>;
      expect(vercelStegaDecode(first[path])).toEqual({ decap: path });

      const second = encodeEntry({ [path]: 'value two' }, fields) as Record<string, string>;
      expect(second[path].startsWith('value two')).toBe(true);
      expect(vercelStegaDecode(second[path])).toEqual({ decap: path });
      expect(second[path]).not.toBe(first[path]);
    });

    it('caches the top-level entry value itself so an identical root value short-circuits', () => {
      const fields: CmsField[] = [stringField({ name: 'title' })];
      const entry = { title: 'hello' };

      const first = encodeEntry(entry, fields) as Record<string, unknown>;
      // Passing the exact same (now-encoded) object reference back in at the
      // root path ('') must hit the cache and return it untouched.
      const second = encodeEntry(first, fields);
      expect(second).toBe(first);
    });
  });
});
