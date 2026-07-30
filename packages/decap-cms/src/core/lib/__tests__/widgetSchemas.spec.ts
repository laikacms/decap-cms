import { describe, expect, it } from 'vitest';

import { validateJSONSchema } from '@/core/lib/jsonSchemaValidator';
import codeWidgetSchema from '@/widgets/code/schema';
import datetimeWidgetSchema from '@/widgets/datetime/schema';
import fileWidgetSchema from '@/widgets/file/schema';
import imageWidgetSchema from '@/widgets/image/schema';
import listWidgetSchema from '@/widgets/list/schema';
import mapWidgetSchema from '@/widgets/map/schema';
import numberWidgetSchema from '@/widgets/number/schema';
import objectWidgetSchema from '@/widgets/object/schema';
import relationWidgetSchema from '@/widgets/relation/schema';
import selectWidgetSchema from '@/widgets/select/schema';
import uuidWidgetSchema from '@/widgets/uuid/schema';

import type { JSONSchema } from '@/core/lib/jsonSchemaValidator';

/**
 * Exercises the `widgets` dispatch keyword (jsonSchemaValidator.ts:191-193)
 * against every widget's own `schema.ts`, so a future edit that widens,
 * narrows, or drops a declared property type is caught by a failing test
 * instead of silently going unvalidated at collection-config-validation
 * time.
 */
function fieldSchemaFor(widget: string, widgetSchema: JSONSchema): JSONSchema {
  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      widget: { type: 'string' },
    },
    required: ['name'],
    widgets: { [widget]: widgetSchema },
  };
}

describe('widget config schema wiring', () => {
  it('code: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('code', codeWidgetSchema);

    expect(
      validateJSONSchema(schema, {
        name: 'snippet',
        widget: 'code',
        default_language: 'js',
        allow_language_selection: true,
      }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, {
        name: 'snippet',
        widget: 'code',
        allow_language_selection: 'yes',
      }),
    ).not.toEqual([]);
  });

  it('datetime: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('datetime', datetimeWidgetSchema);

    expect(
      validateJSONSchema(schema, {
        name: 'published',
        widget: 'datetime',
        format: 'YYYY-MM-DD',
        picker_utc: true,
      }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'published', widget: 'datetime', picker_utc: 'yes' }),
    ).not.toEqual([]);
  });

  it('file: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('file', fileWidgetSchema);

    expect(
      validateJSONSchema(schema, {
        name: 'attachment',
        widget: 'file',
        allow_multiple: true,
        choose_url: false,
      }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'attachment', widget: 'file', allow_multiple: 'yes' }),
    ).not.toEqual([]);
  });

  it('image: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('image', imageWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'photo', widget: 'image', allow_multiple: true, choose_url: true }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'photo', widget: 'image', choose_url: 'yes' }),
    ).not.toEqual([]);
  });

  it('list: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('list', listWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'items', widget: 'list', min: 1, max: 10, allow_add: true }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'items', widget: 'list', min: 'not-a-number' }),
    ).not.toEqual([]);
  });

  it('map: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('map', mapWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'location', widget: 'map', decimals: 2, type: 'Point' }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'location', widget: 'map', decimals: 'two' }),
    ).not.toEqual([]);
  });

  it('number: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('number', numberWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'age', widget: 'number', min: 0, max: 100, step: 1 }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'age', widget: 'number', min: 'not-a-number' }),
    ).not.toEqual([]);
  });

  it('object: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('object', objectWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'meta', widget: 'object', collapsed: true, i18n: false }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'meta', widget: 'object', collapsed: 'yes' }),
    ).not.toEqual([]);
  });

  it('relation: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('relation', relationWidgetSchema);

    expect(
      validateJSONSchema(schema, {
        name: 'author',
        widget: 'relation',
        collection: 'authors',
        value_field: 'slug',
        search_fields: ['name'],
        multiple: true,
      }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, {
        name: 'author',
        widget: 'relation',
        collection: 'authors',
        value_field: 'slug',
        search_fields: ['name'],
        multiple: 'yes',
      }),
    ).not.toEqual([]);
  });

  it('select: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('select', selectWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'category', widget: 'select', options: ['a', 'b'], min: 1 }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, {
        name: 'category',
        widget: 'select',
        options: ['a', 'b'],
        min: 'not-a-number',
      }),
    ).not.toEqual([]);
  });

  it('uuid: accepts valid and rejects wrongly typed properties', () => {
    const schema = fieldSchemaFor('uuid', uuidWidgetSchema);

    expect(
      validateJSONSchema(schema, { name: 'id', widget: 'uuid', prefix: 'post-', read_only: true }),
    ).toEqual([]);

    expect(
      validateJSONSchema(schema, { name: 'id', widget: 'uuid', read_only: 'yes' }),
    ).not.toEqual([]);
  });
});
