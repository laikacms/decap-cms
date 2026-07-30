import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import { lexicalEditorWidgetSchema } from '@/widgets/richtext/widget/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

describe('richtext widget config schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { richtext: lexicalEditorWidgetSchema },
  };

  it('accepts a valid richtext field config', () => {
    const fieldConfig = {
      name: 'body',
      widget: 'richtext',
      format: 'markdown',
      placeholder: 'Write something...',
      blocks: ['callout', 'image'],
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects blocks with the wrong type', () => {
    const fieldConfig = { name: 'body', widget: 'richtext', blocks: 'callout' };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects blocks with non-string items', () => {
    const fieldConfig = { name: 'body', widget: 'richtext', blocks: [1, 2] };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects format with the wrong type', () => {
    const fieldConfig = { name: 'body', widget: 'richtext', format: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects placeholder with the wrong type', () => {
    const fieldConfig = { name: 'body', widget: 'richtext', placeholder: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
