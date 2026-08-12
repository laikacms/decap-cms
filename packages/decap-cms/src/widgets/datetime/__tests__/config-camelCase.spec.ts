import { describe, expect, test, vi } from 'vitest';

import { normalizeConfig } from '@/core/actions/config';

describe('datetime widget deprecated camelCase aliases', () => {
  test('normalizes dateFormat, timeFormat, and pickerUtc to their snake_case equivalents, warning once per key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledWith(
      "Field date is using a deprecated configuration 'dateFormat'. Please use 'date_format'",
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Field date is using a deprecated configuration 'timeFormat'. Please use 'time_format'",
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Field date is using a deprecated configuration 'pickerUtc'. Please use 'picker_utc'",
    );

    warnSpy.mockRestore();
  });
});
