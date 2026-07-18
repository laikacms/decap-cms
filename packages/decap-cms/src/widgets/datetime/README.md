# Datetime widget

The datetime widget lets an entry hold a date and/or time value, rendered as a native browser
`<input>` (its `type` is one of `datetime-local`, `date`, or `time`, chosen automatically from the
config — see "Format" below). It stores the value as a string, formatted per `format`,
`date_format`, and `time_format`. Source: `schema.ts`, `DateTimeControl.tsx`.

## Config

```yaml
- label: 'Publish Date'
  name: 'date'
  widget: 'datetime'
```

- `format` (optional string) — a full [dayjs](https://day.js.org/docs/en/display/format) format
  token string for parsing/storing the value, e.g. `'DD.MM.YYYY HH:mm'`. When set, it takes
  precedence over `date_format`/`time_format` for the stored format, and the input always renders
  as `datetime-local`. When unset, the default stored format is
  `'YYYY-MM-DDTHH:mm:ss.SSSZ'` (`'YYYY-MM-DDTHH:mm:ss.SSS[Z]'` when `picker_utc: true`). Source:
  `schema.ts` (`format: { type: 'string' }`), `DateTimeControl.tsx` (`getFormat()`).
- `date_format` (optional string or boolean) — see "`date_format` and `time_format`" below.
- `time_format` (optional string or boolean) — see "`date_format` and `time_format`" below.
- `picker_utc` (optional boolean, default `false`) — render and store the value in UTC instead of
  the browser's local timezone. Source: `DateTimeControl.tsx` (`const isUtc = field.picker_utc ||
  false`).

## `date_format` and `time_format`

`date_format` and `time_format` are each a tri-state config: unset, a dayjs format string, or a
literal boolean. They only take effect when `format` is **not** set — an explicit `format`
overrides both. Source: `schema.ts` (`oneOf: [{ type: 'string' }, { type: 'boolean' }]`),
`DateTimeControl.tsx` (`getFormat()`).

- Unset (default) — no effect; the widget falls back to its default `datetime-local` behavior.
- A string — a dayjs format token for that part of the value, e.g. `date_format: 'YYYY-MM-DD'`.
  - `date_format: true` is shorthand for `date_format: 'YYYY-MM-DD'`.
  - `time_format: true` is shorthand for `time_format: 'HH:mm'`.
  - If both `date_format` and `time_format` resolve to strings, they are joined with a literal
    `T` into a single stored format (`` `${date_format}T${time_format}` ``) and the input renders
    as `datetime-local`.
  - If only one of them resolves to a string, the input renders as just that part (`date` or
    `time`) using that format.
- `false` — **switches the input type**, independent of any other setting:
  - `date_format: false` forces the input to render as a bare `time` picker (date portion
    dropped).
  - `time_format: false` forces the input to render as a bare `date` picker (time portion
    dropped).

  This `false` → input-type-switch is applied last and always wins, even when `date_format`/
  `time_format` are otherwise unset. Source: `DateTimeControl.tsx` (`if (dateFormat === false)
  inputType = 'time'; if (timeFormat === false) inputType = 'date';`).

```yaml
# Date-only field (time input is dropped)
- label: 'Publish Date'
  name: 'date'
  widget: 'datetime'
  time_format: false
  date_format: 'YYYY-MM-DD'
```

```yaml
# Time-only field (date input is dropped)
- label: 'Daily Reminder Time'
  name: 'reminder_time'
  widget: 'datetime'
  date_format: false
  time_format: 'HH:mm'
```

## UTC vs. local time

By default the widget reads and writes values in the browser's local timezone. Set
`picker_utc: true` to use UTC instead — the stored value's offset marker is a literal `Z` rather
than a numeric offset, and a `UTC` label is shown next to the input. Source:
`DateTimeControl.tsx` (`escapeZ()`, the `isUtc &&` label).

```yaml
- label: 'Publish Date'
  name: 'date'
  widget: 'datetime'
  picker_utc: true
```

## `{{now}}` default

If a field's default value is the literal string `{{now}}`, the widget substitutes the current
date/time (in the configured format) on mount, and flags that substitution with
`{ fromDefault: true }` metadata so a freshly-created entry is not marked as user-edited just
because of it (DCMS-416).

```yaml
- label: 'Created At'
  name: 'created_at'
  widget: 'datetime'
  default: '{{now}}'
```

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
