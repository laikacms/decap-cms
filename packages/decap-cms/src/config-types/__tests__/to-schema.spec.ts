import { describe, expect, it } from 'vitest';

import { toEffectSchema, toZodMiniSchema, toZodSchema } from '@/config-types/to-schema';

const FIELDS = [
  { name: 'title', widget: 'string' },
  { name: 'summary', widget: 'string', required: false },
  { name: 'views', widget: 'number' },
  { name: 'published', widget: 'boolean' },
  { name: 'status', widget: 'select', options: ['draft', 'published'] },
  { name: 'authors', widget: 'select', options: [{ value: 'a' }, { value: 'b' }], multiple: true },
  {
    name: 'seo',
    widget: 'object',
    fields: [
      { name: 'metaTitle', widget: 'string' },
      { name: 'metaDescription', widget: 'string', required: false },
    ],
  },
  {
    name: 'sections',
    widget: 'list',
    fields: [
      { name: 'heading', widget: 'string' },
      { name: 'body', widget: 'string', required: false },
    ],
  },
  { name: 'tags', widget: 'list', field: { widget: 'string' } },
  { name: 'extra', widget: 'object' },
  { name: 'thirdParty', widget: 'some-unknown-widget' },
] as const;

const VALID_ENTRY = {
  title: 'Hello',
  views: 3,
  published: true,
  status: 'draft',
  authors: ['a', 'b'],
  seo: { metaTitle: 'Meta' },
  sections: [{ heading: 'H1' }, { heading: 'H2', body: 'Body' }],
  tags: ['x', 'y'],
  extra: { anything: 'goes' },
  thirdParty: { whatever: true },
};

const INVALID_ENTRY = {
  title: 123,
  views: 'not-a-number',
  published: 'nope',
  status: 'unknown-status',
  authors: ['a', 'b'],
  seo: { metaTitle: 'Meta' },
  sections: [{ heading: 'H1' }],
  tags: ['x'],
  extra: {},
  thirdParty: {},
};

describe('toZodSchema', () => {
  const schema = toZodSchema(FIELDS);

  it('parses a valid entry', () => {
    const result = schema.safeParse(VALID_ENTRY);
    expect(result.success).toBe(true);
  });

  it('accepts a missing optional field', () => {
    const { summary: _summary, ...rest } = VALID_ENTRY;
    const result = schema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects wrong scalar types', () => {
    const result = schema.safeParse(INVALID_ENTRY);
    expect(result.success).toBe(false);
  });

  it('rejects a select value outside the literal union', () => {
    const result = schema.safeParse({ ...VALID_ENTRY, status: 'not-an-option' });
    expect(result.success).toBe(false);
  });

  it('is Standard Schema compatible', async () => {
    const standard = schema['~standard'];
    expect(standard.version).toBe(1);
    const outcome = await standard.validate(VALID_ENTRY);
    expect('issues' in outcome ? outcome.issues : undefined).toBeUndefined();
  });
});

describe('toZodMiniSchema', () => {
  const schema = toZodMiniSchema(FIELDS);

  it('parses a valid entry', () => {
    const result = schema.safeParse(VALID_ENTRY);
    expect(result.success).toBe(true);
  });

  it('rejects wrong scalar types', () => {
    const result = schema.safeParse(INVALID_ENTRY);
    expect(result.success).toBe(false);
  });

  it('is Standard Schema compatible', async () => {
    const standard = schema['~standard'];
    expect(standard.version).toBe(1);
    const outcome = await standard.validate(VALID_ENTRY);
    expect('issues' in outcome ? outcome.issues : undefined).toBeUndefined();
  });
});

describe('toEffectSchema', () => {
  const schema = toEffectSchema(FIELDS);

  it('is Standard Schema compatible and accepts a valid entry', async () => {
    const standard = schema['~standard'];
    expect(standard.version).toBe(1);
    const outcome = await standard.validate(VALID_ENTRY);
    expect('issues' in outcome ? outcome.issues : undefined).toBeUndefined();
  });

  it('rejects wrong scalar types', async () => {
    const standard = schema['~standard'];
    const outcome = await standard.validate(INVALID_ENTRY);
    expect('issues' in outcome && outcome.issues && outcome.issues.length > 0).toBe(true);
  });
});
