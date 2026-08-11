import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import fileSchema from '@/widgets/file/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('file widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { file: fileSchema },
  };

  it('accepts a valid file field config', () => {
    const fieldConfig = {
      name: 'attachment',
      widget: 'file',
      allow_multiple: true,
      choose_url: false,
      private: true,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts a media_library config with allow_multiple and nested config', () => {
    const fieldConfig = {
      name: 'attachment',
      widget: 'file',
      media_library: {
        allow_multiple: false,
        config: { multiple: true },
      },
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts a field config with no file-specific options', () => {
    const fieldConfig = { name: 'attachment', widget: 'file' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects allow_multiple with the wrong type', () => {
    const fieldConfig = { name: 'attachment', widget: 'file', allow_multiple: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects choose_url with the wrong type', () => {
    const fieldConfig = { name: 'attachment', widget: 'file', choose_url: 'no' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects private with the wrong type', () => {
    const fieldConfig = { name: 'attachment', widget: 'file', private: 'secret' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects a media_library that is not an object', () => {
    const fieldConfig = { name: 'attachment', widget: 'file', media_library: 'cloudinary' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects media_library.allow_multiple with the wrong type', () => {
    const fieldConfig = {
      name: 'attachment',
      widget: 'file',
      media_library: { allow_multiple: 'yes' },
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects media_library.config with the wrong type', () => {
    const fieldConfig = {
      name: 'attachment',
      widget: 'file',
      media_library: { config: 'not-an-object' },
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
