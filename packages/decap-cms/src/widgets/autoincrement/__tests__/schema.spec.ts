import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import autoincrementSchema from '@/widgets/autoincrement/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('autoincrement widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { autoincrement: autoincrementSchema },
  };

  it('accepts a valid autoincrement field config', () => {
    const fieldConfig = {
      name: 'ticketId',
      widget: 'autoincrement',
      start: 1000,
      read_only: true,
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts a bare autoincrement field config with no options', () => {
    const fieldConfig = { name: 'ticketId', widget: 'autoincrement' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects start with the wrong type', () => {
    const fieldConfig = { name: 'ticketId', widget: 'autoincrement', start: '1000' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects read_only with the wrong type', () => {
    const fieldConfig = { name: 'ticketId', widget: 'autoincrement', read_only: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
