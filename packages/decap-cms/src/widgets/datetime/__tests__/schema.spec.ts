import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import datetimeSchema from '@/widgets/datetime/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('datetime widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { datetime: datetimeSchema },
  };

  it('accepts a valid datetime field config with string date_format/time_format', () => {
    const fieldConfig = {
      name: 'published',
      widget: 'datetime',
      format: 'YYYY-MM-DD',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm',
      picker_utc: true,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts date_format/time_format as booleans', () => {
    const fieldConfig = {
      name: 'published',
      widget: 'datetime',
      date_format: true,
      time_format: false,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects format with the wrong type', () => {
    const fieldConfig = { name: 'published', widget: 'datetime', format: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects date_format with a non string/boolean type', () => {
    const fieldConfig = { name: 'published', widget: 'datetime', date_format: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects time_format with a non string/boolean type', () => {
    const fieldConfig = { name: 'published', widget: 'datetime', time_format: {} };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects picker_utc with the wrong type', () => {
    const fieldConfig = { name: 'published', widget: 'datetime', picker_utc: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
