import { describe, expect, test } from 'vitest';

import { normalizeConfig } from '@/core/actions/config';

describe('datetime widget deprecated camelCase aliases', () => {
  test('normalizes dateFormat, timeFormat, and pickerUtc to their snake_case equivalents', () => {
    const config = normalizeConfig({
      collections: [
        {
          name: 'posts',
          folder: 'src',
          fields: [
            {
              name: 'date',
              widget: 'datetime',
              dateFormat: 'YYYY',
              timeFormat: 'HH:mm',
              pickerUtc: true,
            },
          ],
        },
      ],
    });

    const field = config.collections[0].fields[0];

    expect(field.date_format).toEqual('YYYY');
    expect(field.time_format).toEqual('HH:mm');
    expect(field.picker_utc).toEqual(true);
  });
});
