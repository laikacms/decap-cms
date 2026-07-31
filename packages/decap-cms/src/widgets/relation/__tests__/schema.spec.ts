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
});
