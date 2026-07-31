import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import listSchema from '@/widgets/list/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

// DCMS-1745: README.md:29-30 documents `add_to_top` (boolean, default false,
// read via `field.add_to_top ?? false` in ListControl.tsx:475), but
// schema.ts's properties never listed it, so a typo like `addToTop` passed
// schema validation silently and the feature just didn't work.
describe('list widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { list: listSchema },
  };

  it('accepts a valid add_to_top config', () => {
    const fieldConfig = { name: 'items', widget: 'list', add_to_top: true };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects add_to_top with the wrong type', () => {
    const fieldConfig = { name: 'items', widget: 'list', add_to_top: 'yes' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('documents add_to_top as a recognized property (a misspelled key like addToTop is not)', () => {
    expect(Object.keys(listSchema.properties)).toContain('add_to_top');
    expect(Object.keys(listSchema.properties)).not.toContain('addToTop');
  });
});
