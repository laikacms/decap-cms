import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { normalizeConfig } from '@/core/actions/config';

// README.md documents `valueField`/`searchFields` as interchangeable with
// `value_field`/`search_fields`, and `displayFields`/`optionsLength` as
// camelCase aliases for `display_fields`/`options_length`. All four are
// migrated by `normalizeConfig`/`setSnakeCaseConfig`/`WIDGET_KEY_MAP`
// (`src/core/actions/config.tsx`) at config-load time, which also logs a
// `console.warn` deprecation notice for each one. This pins both halves of
// that behavior end-to-end (DCMS-2063).
describe('relation widget deprecated camelCase aliases', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('normalizes valueField, searchFields, displayFields, and optionsLength to their snake_case equivalents and warns for each', () => {
    const config = normalizeConfig({
      collections: [
        {
          name: 'posts',
          folder: 'src',
          fields: [
            {
              name: 'author',
              widget: 'relation',
              collection: 'authors',
              valueField: 'name',
              searchFields: ['name'],
              displayFields: ['name', 'email'],
              optionsLength: 50,
            },
          ],
        },
      ],
    } as never);

    const field = config.collections[0].fields[0];

    expect(field.value_field).toEqual('name');
    expect(field.search_fields).toEqual(['name']);
    expect(field.display_fields).toEqual(['name', 'email']);
    expect(field.options_length).toEqual(50);

    expect(console.warn).toHaveBeenCalledWith(
      "Field author is using a deprecated configuration 'valueField'. Please use 'value_field'",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Field author is using a deprecated configuration 'searchFields'. Please use 'search_fields'",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Field author is using a deprecated configuration 'displayFields'. Please use 'display_fields'",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Field author is using a deprecated configuration 'optionsLength'. Please use 'options_length'",
    );
  });
});
