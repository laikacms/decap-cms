/**
 * Shared date/time formatting logic used by both DateTimeControl (editing)
 * and DateTimePreview (read-only display), so the two stay in sync.
 */
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

/**
 * Normalise deprecated camelCase field config keys to their snake_case equivalents.
 * The schema accepts both forms; the implementation reads only snake_case.
 */
export function normalizeField(field) {
  let normalized = field;
  if (normalized.get('date_format') === undefined && normalized.get('dateFormat') !== undefined) {
    normalized = normalized.set('date_format', normalized.get('dateFormat'));
  }
  if (normalized.get('time_format') === undefined && normalized.get('timeFormat') !== undefined) {
    normalized = normalized.set('time_format', normalized.get('timeFormat'));
  }
  if (normalized.get('picker_utc') === undefined && normalized.get('pickerUtc') !== undefined) {
    normalized = normalized.set('picker_utc', normalized.get('pickerUtc'));
  }
  return normalized;
}

export function escapeZ(str) {
  if (typeof str === 'string' && /Z(?![\]])/.test(str)) {
    return str.replace(/Z(?![\]])/g, '[Z]');
  }
  return str;
}

/**
 * Compute the effective storage/display format for a datetime field, honouring
 * format/date_format/time_format/picker_utc, mirroring what DateTimeControl uses
 * to serialize values via handleChange.
 */
export function getFormat(field) {
  const normalized = normalizeField(field);
  const isUtc = normalized.get('picker_utc') || false;

  let inputType = 'datetime-local';
  let inputFormat = 'YYYY-MM-DDTHH:mm';
  let format = `YYYY-MM-DDTHH:mm:ss.SSS${isUtc ? '[Z]' : 'Z'}`;
  let userFormat = normalized?.get('format');
  let dateFormat = normalized?.get('date_format');
  let timeFormat = normalized?.get('time_format');
  if (dateFormat === true) dateFormat = 'YYYY-MM-DD';
  if (timeFormat === true) timeFormat = 'HH:mm';

  if (isUtc) {
    userFormat = escapeZ(userFormat);
    dateFormat = escapeZ(dateFormat);
    timeFormat = escapeZ(timeFormat);
  }

  if (typeof dateFormat === 'string' && typeof timeFormat === 'string') {
    format = `${dateFormat}T${timeFormat}`;
  } else if (typeof timeFormat === 'string') {
    inputType = 'time';
    format = timeFormat;
  } else if (typeof dateFormat === 'string') {
    inputType = 'date';
    format = dateFormat;
  }

  if (typeof userFormat === 'string') {
    format = userFormat;
    inputType = 'datetime-local';
  }

  if (dateFormat === false) {
    inputType = 'time';
    format = typeof timeFormat === 'string' ? timeFormat : 'HH:mm';
  }
  if (timeFormat === false) {
    inputType = 'date';
    format = typeof dateFormat === 'string' ? dateFormat : 'YYYY-MM-DD';
  }
  if (inputType === 'datetime-local') inputFormat = 'YYYY-MM-DDTHH:mm';
  if (inputType === 'date') inputFormat = 'YYYY-MM-DD';
  if (inputType === 'time') inputFormat = 'HH:mm';

  return { format, inputType, inputFormat, isUtc };
}

/**
 * Parse a stored datetime value the same way regardless of caller: try a bare
 * parse first (covers the default ISO-8601 storage format), and fall back to
 * parsing with the field's configured `format` for values that were saved
 * using a custom format and can't be parsed without it (dayjs can't infer a
 * non-ISO format on its own). Used by both DateTimeControl.formatInputValue
 * and DateTimePreview.formatValue so they stay in sync.
 */
export function parseStoredValue(value, { format, isUtc }) {
  const bare = isUtc ? dayjs.utc(value) : dayjs(value);
  if (bare.isValid()) {
    return bare;
  }
  return isUtc ? dayjs.utc(value, format) : dayjs(value, format);
}

/**
 * Whether the field has any explicit format configuration (format/date_format/
 * time_format, including the deprecated camelCase aliases). When none are set,
 * the raw saved value should be shown as-is.
 */
export function hasFormatOptions(field) {
  return ['format', 'date_format', 'time_format', 'dateFormat', 'timeFormat'].some(
    key => field.get(key) !== undefined,
  );
}
