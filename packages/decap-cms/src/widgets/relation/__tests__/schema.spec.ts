import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import relationSchema from '@/widgets/relation/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('relation widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { relation: relationSchema },
  };

  it('accepts a valid camelCase relation field config', () => {
    const fieldConfig = {
      name: 'author',
      widget: 'relation',
      collection: 'authors',
      valueField: 'slug',
      searchFields: ['name'],
      displayFields: ['name'],
      optionsLength: 50,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  describe('mixed snake_case and camelCase aliases', () => {
    const base = { name: 'author', widget: 'relation', collection: 'authors' };

    it.each([
      ['value_field + searchFields', { value_field: 'slug', searchFields: ['name'] }],
      ['valueField + search_fields', { valueField: 'slug', search_fields: ['name'] }],
      [
        'all four keys',
        { value_field: 'slug', valueField: 'slug', search_fields: ['name'], searchFields: ['name'] },
      ],
    ])('accepts %s', (_label, keys) => {
      expect(validateJSONSchema(fieldSchema, { ...base, ...keys })).toEqual([]);
    });

    it.each([
      ['value_field', { search_fields: ['name'] }],
      ['search_fields', { value_field: 'slug' }],
      ['searchFields only', { searchFields: ['name'] }],
    ])('rejects when a pair is missing (%s)', (_label, keys) => {
      expect(validateJSONSchema(fieldSchema, { ...base, ...keys })).not.toEqual([]);
    });

    it('rejects a missing collection', () => {
      const { collection: _c, ...noCollection } = base;
      expect(
        validateJSONSchema(fieldSchema, { ...noCollection, value_field: 'slug', search_fields: ['a'] }),
      ).not.toEqual([]);
    });
  });

  it('rejects displayFields with the wrong type', () => {
    const fieldConfig = {
      name: 'author',
      widget: 'relation',
      collection: 'authors',
      valueField: 'slug',
      searchFields: ['name'],
      displayFields: 'name',
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects optionsLength with the wrong type', () => {
    const fieldConfig = {
      name: 'author',
      widget: 'relation',
      collection: 'authors',
      valueField: 'slug',
      searchFields: ['name'],
      optionsLength: 'not-a-number',
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  describe.each(['options_length', 'optionsLength'])('%s range', key => {
    const base = { name: 'author', widget: 'relation', collection: 'authors' };
    const required =
      key === 'options_length'
        ? { value_field: 'slug', search_fields: ['name'] }
        : { valueField: 'slug', searchFields: ['name'] };

    it.each([0, -1])('rejects %i', value => {
      const config = { ...base, ...required, [key]: value };
      expect(validateJSONSchema(fieldSchema, config)).not.toEqual([]);
    });

    it.each([1, 20])('accepts %i', value => {
      const config = { ...base, ...required, [key]: value };
      expect(validateJSONSchema(fieldSchema, config)).toEqual([]);
    });
  });
});
