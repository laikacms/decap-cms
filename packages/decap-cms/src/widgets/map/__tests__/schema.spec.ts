import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import mapSchema from '@/widgets/map/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('map widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { map: mapSchema },
  };

  it('accepts a valid map field config', () => {
    const fieldConfig = { name: 'location', widget: 'map', decimals: 4, type: 'Point' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('accepts each allowed type enum value', () => {
    for (const type of ['Point', 'LineString', 'Polygon']) {
      const fieldConfig = { name: 'location', widget: 'map', type };

      expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
    }
  });

  it('rejects decimals with the wrong type', () => {
    const fieldConfig = { name: 'location', widget: 'map', decimals: 'four' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects a type outside the enum', () => {
    const fieldConfig = { name: 'location', widget: 'map', type: 'Circle' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects type with the wrong type', () => {
    const fieldConfig = { name: 'location', widget: 'map', type: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
