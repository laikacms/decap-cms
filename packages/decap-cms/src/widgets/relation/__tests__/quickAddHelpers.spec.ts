import { describe, expect, it } from 'vitest';

import { buildQuickAddOption, getQuickAddFieldNames } from '@/widgets/relation/RelationControl';

type Field = Parameters<typeof getQuickAddFieldNames>[0];

const makeField = (overrides: Record<string, unknown>): Field =>
  ({ name: 'rel', widget: 'relation', collection: 'posts', ...overrides }) as unknown as Field;

describe('getQuickAddFieldNames', () => {
  it('merges value_field and display_fields and deduplicates', () => {
    const field = makeField({ value_field: 'id', display_fields: ['title', 'id', 'title', 'slug'] });
    expect(getQuickAddFieldNames(field)).toEqual(['id', 'title', 'slug']);
  });

  it('falls back to just the value field when display_fields is absent', () => {
    expect(getQuickAddFieldNames(makeField({ value_field: 'id' }))).toEqual(['id']);
  });

  it('excludes dotted keys', () => {
    const field = makeField({ value_field: 'id', display_fields: ['author.name', 'title'] });
    expect(getQuickAddFieldNames(field)).toEqual(['id', 'title']);
  });

  it('excludes templated keys', () => {
    const field = makeField({ value_field: 'id', display_fields: ['{{title}} ({{year}})', 'slug'] });
    expect(getQuickAddFieldNames(field)).toEqual(['id', 'slug']);
  });

  it('excludes a dotted or templated value_field', () => {
    expect(getQuickAddFieldNames(makeField({ value_field: 'a.b', display_fields: ['title'] }))).toEqual([
      'title',
    ]);
    expect(getQuickAddFieldNames(makeField({ value_field: '{{x}}', display_fields: ['title'] }))).toEqual([
      'title',
    ]);
  });

  it('excludes empty-string keys', () => {
    const field = makeField({ value_field: 'id', display_fields: ['', 'title'] });
    expect(getQuickAddFieldNames(field)).toEqual(['id', 'title']);
  });

  it('honours camelCase aliases valueField/displayFields', () => {
    const field = makeField({ valueField: 'id', displayFields: ['title', 'a.b'] });
    expect(getQuickAddFieldNames(field)).toEqual(['id', 'title']);
  });
});

describe('buildQuickAddOption', () => {
  it('uses String(data[valueField]) as value', () => {
    const field = makeField({ value_field: 'id', display_fields: ['title'] });
    const option = buildQuickAddOption(field, { id: 42, title: 'Hello' });
    expect(option.value).toBe('42');
    expect(typeof option.value).toBe('string');
  });

  it('joins display_fields with a space and trims the label', () => {
    const field = makeField({ value_field: 'id', display_fields: ['first', 'last'] });
    expect(buildQuickAddOption(field, { id: 'x', first: 'Ada', last: 'Lovelace' }).label).toBe(
      'Ada Lovelace',
    );
    expect(buildQuickAddOption(field, { id: 'x', first: 'Ada', last: '' }).label).toBe('Ada');
    expect(buildQuickAddOption(field, { id: 'x', first: '', last: 'Lovelace' }).label).toBe(
      'Lovelace',
    );
  });

  it('falls back label to value when all display fields are empty or missing', () => {
    const field = makeField({ value_field: 'id', display_fields: ['first', 'last'] });
    expect(buildQuickAddOption(field, { id: 'x', first: '', last: '' }).label).toBe('x');
    expect(buildQuickAddOption(field, { id: 'x' }).label).toBe('x');
  });

  it('uses the value field as label when display_fields is absent', () => {
    const option = buildQuickAddOption(makeField({ value_field: 'id' }), { id: 'abc' });
    expect(option.label).toBe('abc');
  });

  it('yields an empty string, not "undefined", when the value field is missing', () => {
    const field = makeField({ value_field: 'id', display_fields: ['title'] });
    const option = buildQuickAddOption(field, { title: 'Only title' });
    expect(option.value).toBe('');
    expect(option.label).toBe('Only title');
    const empty = buildQuickAddOption(field, {});
    expect(empty.value).toBe('');
    expect(empty.label).toBe('');
  });

  it('returns the original data object on the option', () => {
    const field = makeField({ value_field: 'id' });
    const data = { id: 'x' };
    expect(buildQuickAddOption(field, data).data).toBe(data);
  });

  it('honours camelCase aliases valueField/displayFields', () => {
    const field = makeField({ valueField: 'id', displayFields: ['first', 'last'] });
    const option = buildQuickAddOption(field, { id: 7, first: 'Ada', last: 'L' });
    expect(option).toEqual({ data: { id: 7, first: 'Ada', last: 'L' }, value: '7', label: 'Ada L' });
  });
});
