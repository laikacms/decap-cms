import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import codeSchema from '@/widgets/code/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('code widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { code: codeSchema },
  };

  it('accepts a valid code field config', () => {
    const fieldConfig = {
      name: 'snippet',
      widget: 'code',
      default_language: 'javascript',
      allow_language_selection: true,
      output_code_only: false,
      keys: { code: 'body', lang: 'language' },
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects default_language with the wrong type', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', default_language: 42 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects allow_language_selection with the wrong type', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', allow_language_selection: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects output_code_only with the wrong type', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', output_code_only: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects keys with the wrong shape', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', keys: 'code' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects keys.code with the wrong type', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', keys: { code: 1, lang: 'language' } };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects keys.lang with the wrong type', () => {
    const fieldConfig = { name: 'snippet', widget: 'code', keys: { code: 'body', lang: 1 } };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
