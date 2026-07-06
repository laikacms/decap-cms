import { normalizeField, escapeZ, getFormat, hasFormatOptions } from '../DateTimeFormatter';

describe('normalizeField', () => {
  test('maps deprecated dateFormat onto date_format', () => {
    const field = new Map([['dateFormat', 'DD/MM/YYYY']]);
    const normalized = normalizeField(field);
    expect(normalized.get('date_format')).toBe('DD/MM/YYYY');
  });

  test('maps deprecated timeFormat onto time_format', () => {
    const field = new Map([['timeFormat', 'HH:mm:ss']]);
    const normalized = normalizeField(field);
    expect(normalized.get('time_format')).toBe('HH:mm:ss');
  });

  test('maps deprecated pickerUtc onto picker_utc', () => {
    const field = new Map([['pickerUtc', true]]);
    const normalized = normalizeField(field);
    expect(normalized.get('picker_utc')).toBe(true);
  });

  test('is a no-op when the snake_case key is already set', () => {
    const field = new Map([
      ['date_format', 'YYYY-MM-DD'],
      ['dateFormat', 'DD/MM/YYYY'],
    ]);
    const normalized = normalizeField(field);
    expect(normalized.get('date_format')).toBe('YYYY-MM-DD');
  });

  test('is a no-op when neither camelCase nor snake_case keys are set', () => {
    const field = new Map();
    const normalized = normalizeField(field);
    expect(normalized.get('date_format')).toBeUndefined();
    expect(normalized.get('time_format')).toBeUndefined();
    expect(normalized.get('picker_utc')).toBeUndefined();
  });
});

describe('escapeZ', () => {
  test('escapes a bare trailing Z', () => {
    expect(escapeZ('YYYY-MM-DDTHH:mm:ss.SSSZ')).toBe('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  });

  test('leaves an already-bracketed [Z] alone', () => {
    expect(escapeZ('YYYY-MM-DDTHH:mm:ss.SSS[Z]')).toBe('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  });

  test('passes through a string with no Z untouched', () => {
    expect(escapeZ('YYYY-MM-DD')).toBe('YYYY-MM-DD');
  });

  test('passes through non-string input untouched', () => {
    expect(escapeZ(undefined)).toBeUndefined();
    expect(escapeZ(true)).toBe(true);
    expect(escapeZ(false)).toBe(false);
  });
});

describe('getFormat', () => {
  test('defaults to a UTC-suffixed ISO datetime format with no options', () => {
    const field = new Map();
    expect(getFormat(field)).toEqual({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      inputType: 'datetime-local',
      inputFormat: 'YYYY-MM-DDTHH:mm',
      isUtc: false,
    });
  });

  test('combines date_format and time_format', () => {
    const field = new Map([
      ['date_format', 'YYYY-MM-DD'],
      ['time_format', 'HH:mm'],
    ]);
    const result = getFormat(field);
    expect(result.format).toBe('YYYY-MM-DDTHH:mm');
    expect(result.inputType).toBe('datetime-local');
    expect(result.inputFormat).toBe('YYYY-MM-DDTHH:mm');
  });

  test('date_format alone produces a date input', () => {
    const field = new Map([['date_format', 'DD/MM/YYYY']]);
    const result = getFormat(field);
    expect(result.format).toBe('DD/MM/YYYY');
    expect(result.inputType).toBe('date');
    expect(result.inputFormat).toBe('YYYY-MM-DD');
  });

  test('time_format alone produces a time input', () => {
    const field = new Map([['time_format', 'HH:mm:ss']]);
    const result = getFormat(field);
    expect(result.format).toBe('HH:mm:ss');
    expect(result.inputType).toBe('time');
    expect(result.inputFormat).toBe('HH:mm');
  });

  test('date_format === true shorthand resolves to YYYY-MM-DD', () => {
    const field = new Map([['date_format', true]]);
    const result = getFormat(field);
    expect(result.format).toBe('YYYY-MM-DD');
    expect(result.inputType).toBe('date');
  });

  test('time_format === true shorthand resolves to HH:mm', () => {
    const field = new Map([['time_format', true]]);
    const result = getFormat(field);
    expect(result.format).toBe('HH:mm');
    expect(result.inputType).toBe('time');
  });

  test('date_format === false shorthand forces a time-only input', () => {
    const field = new Map([['date_format', false]]);
    const result = getFormat(field);
    expect(result.inputType).toBe('time');
    expect(result.format).toBe('HH:mm');
    expect(result.inputFormat).toBe('HH:mm');
  });

  test('date_format === false combined with an explicit time_format keeps that format', () => {
    const field = new Map([
      ['date_format', false],
      ['time_format', 'HH:mm:ss'],
    ]);
    const result = getFormat(field);
    expect(result.inputType).toBe('time');
    expect(result.format).toBe('HH:mm:ss');
  });

  test('time_format === false shorthand forces a date-only input', () => {
    const field = new Map([['time_format', false]]);
    const result = getFormat(field);
    expect(result.inputType).toBe('date');
    expect(result.format).toBe('YYYY-MM-DD');
    expect(result.inputFormat).toBe('YYYY-MM-DD');
  });

  test('time_format === false combined with an explicit date_format keeps that format', () => {
    const field = new Map([
      ['time_format', false],
      ['date_format', 'DD/MM/YYYY'],
    ]);
    const result = getFormat(field);
    expect(result.inputType).toBe('date');
    expect(result.format).toBe('DD/MM/YYYY');
  });

  test('explicit format overrides the computed date_format/time_format', () => {
    const field = new Map([
      ['format', 'X'],
      ['date_format', 'YYYY-MM-DD'],
      ['time_format', 'HH:mm'],
    ]);
    const result = getFormat(field);
    expect(result.format).toBe('X');
    expect(result.inputType).toBe('datetime-local');
    expect(result.inputFormat).toBe('YYYY-MM-DDTHH:mm');
  });

  test('picker_utc marks the result as UTC and escapes Z in a supplied format', () => {
    const field = new Map([
      ['format', 'YYYY-MM-DDTHH:mm:ss.SSSZ'],
      ['picker_utc', true],
    ]);
    const result = getFormat(field);
    expect(result.isUtc).toBe(true);
    expect(result.format).toBe('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  });

  test('picker_utc escapes Z in date_format and time_format inputs', () => {
    const field = new Map([
      ['date_format', 'YYYY-MM-DDZ'],
      ['time_format', 'HH:mmZ'],
      ['picker_utc', true],
    ]);
    const result = getFormat(field);
    expect(result.isUtc).toBe(true);
    expect(result.format).toBe('YYYY-MM-DD[Z]THH:mm[Z]');
  });

  test('picker_utc with no explicit formats uses the bracketed default', () => {
    const field = new Map([['picker_utc', true]]);
    const result = getFormat(field);
    expect(result.isUtc).toBe(true);
    expect(result.format).toBe('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  });

  test('normalizes deprecated camelCase keys before resolving the format', () => {
    const field = new Map([
      ['dateFormat', 'DD/MM/YYYY'],
      ['pickerUtc', true],
    ]);
    const result = getFormat(field);
    expect(result.inputType).toBe('date');
    expect(result.format).toBe('DD/MM/YYYY');
    expect(result.isUtc).toBe(true);
  });
});

describe('hasFormatOptions', () => {
  test('returns false when no format keys are set', () => {
    const field = new Map();
    expect(hasFormatOptions(field)).toBe(false);
  });

  test('returns true when format is set', () => {
    const field = new Map([['format', 'X']]);
    expect(hasFormatOptions(field)).toBe(true);
  });

  test('returns true when date_format is set', () => {
    const field = new Map([['date_format', 'YYYY-MM-DD']]);
    expect(hasFormatOptions(field)).toBe(true);
  });

  test('returns true when time_format is set', () => {
    const field = new Map([['time_format', 'HH:mm']]);
    expect(hasFormatOptions(field)).toBe(true);
  });

  test('returns true when the deprecated dateFormat alias is set', () => {
    const field = new Map([['dateFormat', 'YYYY-MM-DD']]);
    expect(hasFormatOptions(field)).toBe(true);
  });

  test('returns true when the deprecated timeFormat alias is set', () => {
    const field = new Map([['timeFormat', 'HH:mm']]);
    expect(hasFormatOptions(field)).toBe(true);
  });

  test('returns false when only picker_utc is set', () => {
    const field = new Map([['picker_utc', true]]);
    expect(hasFormatOptions(field)).toBe(false);
  });
});
