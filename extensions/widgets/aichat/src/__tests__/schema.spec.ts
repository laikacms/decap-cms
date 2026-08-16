import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@laikacms/decap-cms/core';
import aichatSchema from '../schema';

import type { JSONSchema } from '@laikacms/decap-cms/core';

describe('aichat widget schema', () => {
  const fieldSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { 'ai-chat': aichatSchema },
  };

  it('accepts a valid ai-chat field config', () => {
    const fieldConfig = {
      name: 'assistant',
      widget: 'ai-chat',
      placeholder: 'Ask me anything...',
      welcomeMessage: 'Hi, how can I help?',
      maxHeight: '500px',
    };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).toEqual([]);
  });

  it('rejects placeholder with the wrong type', () => {
    const fieldConfig = { name: 'assistant', widget: 'ai-chat', placeholder: 123 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects welcomeMessage with the wrong type', () => {
    const fieldConfig = { name: 'assistant', widget: 'ai-chat', welcomeMessage: true };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });

  it('rejects maxHeight with the wrong type', () => {
    const fieldConfig = { name: 'assistant', widget: 'ai-chat', maxHeight: 500 };

    expect(validateJSONSchema(fieldSchema, fieldConfig)).not.toEqual([]);
  });
});
