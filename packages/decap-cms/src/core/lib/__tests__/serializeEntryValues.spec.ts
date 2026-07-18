import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deserializeValues, serializeValues } from '@/core/lib/serializeEntryValues';

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

describe('runSerializer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('dispatches to the widget-specific serializer registered for a field', async () => {
    const { registerWidgetValueSerializer } = await import('@/core/lib/registry');
    const { serializeValues: serialize, deserializeValues: deserialize } = await import(
      '@/core/lib/serializeEntryValues'
    );

    registerWidgetValueSerializer('richtext', {
      serialize: (value: unknown) => `serialized:${value}`,
      deserialize: (value: unknown) => String(value).replace(/^serialized:/, ''),
    });

    const body = [{ name: 'body', widget: 'richtext' }];

    expect(serialize({ body: 'hello' }, body)).toEqual({ body: 'serialized:hello' });
    expect(deserialize({ body: 'serialized:hello' }, body)).toEqual({ body: 'hello' });
  });

  it('leaves values untouched when no serializer is registered for the widget', async () => {
    const { serializeValues: serialize, deserializeValues: deserialize } = await import(
      '@/core/lib/serializeEntryValues'
    );

    const stringField = [{ name: 'title', widget: 'string' }];

    expect(serialize({ title: 'New Post' }, stringField)).toEqual({ title: 'New Post' });
    expect(deserialize({ title: 'New Post' }, stringField)).toEqual({ title: 'New Post' });
  });

  it('skips serialization for fields whose value is nil', async () => {
    const { registerWidgetValueSerializer } = await import('@/core/lib/registry');
    const { serializeValues: serialize } = await import('@/core/lib/serializeEntryValues');

    const serializeFn = vi.fn((value: unknown) => `serialized:${value}`);
    registerWidgetValueSerializer('richtext', {
      serialize: serializeFn,
      deserialize: (value: unknown) => value,
    });

    const body = [{ name: 'body', widget: 'richtext' }];

    // Nil values are passed through unchanged (original `values` win over the
    // reduced map, which omits nil entries) rather than being serialized.
    expect(serialize({ body: null }, body)).toEqual({ body: null });
    expect(serialize({ body: undefined }, body)).toEqual({ body: undefined });
    expect(serializeFn).not.toHaveBeenCalled();
  });

  it('round-trips nested object fields recursively', async () => {
    const { registerWidgetValueSerializer } = await import('@/core/lib/registry');
    const { serializeValues: serialize, deserializeValues: deserialize } = await import(
      '@/core/lib/serializeEntryValues'
    );

    registerWidgetValueSerializer('richtext', {
      serialize: (value: unknown) => `serialized:${value}`,
      deserialize: (value: unknown) => String(value).replace(/^serialized:/, ''),
    });

    const fieldsWithNestedObject = [
      {
        name: 'author',
        widget: 'object',
        fields: [
          { name: 'name', widget: 'string' },
          { name: 'bio', widget: 'richtext' },
        ],
      },
    ];

    const raw = { author: { name: 'Ada', bio: 'hello' } };

    const serialized = serialize(raw, fieldsWithNestedObject);
    expect(serialized).toEqual({ author: { name: 'Ada', bio: 'serialized:hello' } });

    const deserialized = deserialize(serialized, fieldsWithNestedObject);
    expect(deserialized).toEqual(raw);
  });

  it('round-trips nested list fields recursively, mapping over each entry', async () => {
    const { registerWidgetValueSerializer } = await import('@/core/lib/registry');
    const { serializeValues: serialize, deserializeValues: deserialize } = await import(
      '@/core/lib/serializeEntryValues'
    );

    registerWidgetValueSerializer('richtext', {
      serialize: (value: unknown) => `serialized:${value}`,
      deserialize: (value: unknown) => String(value).replace(/^serialized:/, ''),
    });

    const fieldsWithNestedList = [
      {
        name: 'sections',
        widget: 'list',
        fields: [
          { name: 'title', widget: 'string' },
          { name: 'content', widget: 'richtext' },
        ],
      },
    ];

    const raw = {
      sections: [
        { title: 'Intro', content: 'foo' },
        { title: 'Outro', content: 'bar' },
      ],
    };

    const serialized = serialize(raw, fieldsWithNestedList);
    expect(serialized).toEqual({
      sections: [
        { title: 'Intro', content: 'serialized:foo' },
        { title: 'Outro', content: 'serialized:bar' },
      ],
    });

    const deserialized = deserialize(serialized, fieldsWithNestedList);
    expect(deserialized).toEqual(raw);
  });

  it('preserves unknown top-level fields alongside nested serialized fields', async () => {
    const { serializeValues: serialize } = await import('@/core/lib/serializeEntryValues');

    const fieldsWithNestedObject = [
      {
        name: 'author',
        widget: 'object',
        fields: [{ name: 'name', widget: 'string' }],
      },
    ];

    const raw = { author: { name: 'Ada' }, draft: true };

    expect(serialize(raw, fieldsWithNestedObject)).toEqual({
      author: { name: 'Ada' },
      draft: true,
    });
  });
});
