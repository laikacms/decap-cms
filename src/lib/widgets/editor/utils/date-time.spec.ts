import { describe, expect, it } from 'vitest';

import { formatDateTime, fromDateInputValue, setLocalTime, toDateInputValue } from './date-time';

describe('editor date-time values', () => {
  it('round-trips a local calendar date without shifting its timezone', () => {
    const date = fromDateInputValue('2026-07-14', 15, 27);

    expect(date).toBeDefined();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(6);
    expect(date?.getDate()).toBe(14);
    expect(date?.getHours()).toBe(15);
    expect(date?.getMinutes()).toBe(27);
    expect(toDateInputValue(date)).toBe('2026-07-14');
  });

  it('rejects empty and invalid calendar dates', () => {
    expect(fromDateInputValue('', 0, 0)).toBeUndefined();
    expect(fromDateInputValue('2026-02-31', 0, 0)).toBeUndefined();
  });

  it('changes time without mutating the original date', () => {
    const original = new Date(2026, 6, 14, 8, 10, 20, 30);
    const changed = setLocalTime(original, 17, 45);

    expect(changed).not.toBe(original);
    expect([changed.getHours(), changed.getMinutes()]).toEqual([17, 45]);
    expect([original.getHours(), original.getMinutes()]).toEqual([8, 10]);
  });

  it('formats dates with the browser internationalization API', () => {
    const date = new Date(2026, 6, 14, 15, 27);

    expect(formatDateTime(date, false, 'en-US')).toBe('July 14, 2026');
    expect(formatDateTime(date, true, 'en-US')).toContain('3:27 PM');
  });
});
