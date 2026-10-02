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

  it('accepts keys with only one of code / lang set', () => {
    expect(
      validateJSONSchema(fieldSchema, { name: 's', widget: 'code', keys: { code: 'body' } }),
    ).toEqual([]);
    expect(
      validateJSONSchema(fieldSchema, { name: 's', widget: 'code', keys: { lang: 'language' } }),
    ).toEqual([]);
  });

  it('rejects an empty keys.code', () => {
    const errors = validateJSONSchema(fieldSchema, {
      name: 's',
      widget: 'code',
      keys: { code: '', lang: 'language' },
    });

    expect(errors.map(e => [e.instancePath, e.keyword])).toEqual([['/keys/code', 'minLength']]);
  });

  it('rejects an empty keys.lang', () => {
    const errors = validateJSONSchema(fieldSchema, {
      name: 's',
      widget: 'code',
      keys: { code: 'body', lang: '' },
    });

    expect(errors.map(e => [e.instancePath, e.keyword])).toEqual([['/keys/lang', 'minLength']]);
  });

  it('rejects keys.code equal to keys.lang, naming both fields', () => {
    const errors = validateJSONSchema(fieldSchema, {
      name: 's',
      widget: 'code',
      keys: { code: 'body', lang: 'body' },
    });

    expect(errors.map(e => [e.instancePath, e.keyword, e.message])).toEqual([
      ['/keys', 'distinctProperties', "must NOT have the same value for 'code' and 'lang'"],
    ]);
  });
});
