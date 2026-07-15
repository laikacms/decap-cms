# decap-cms-widget-datetime

The DateTime widget translates a native date/time picker UI into a formatted datetime string value.

## Options

| Name          | Type              | Default                        | Description                                                                                                                                            |
| ------------- | ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`      | string             |                                  | A [dayjs](https://day.js.org/docs/en/display/format) format string used to store and display the value. Overrides `date_format`/`time_format` and always uses a combined `datetime-local` input. |
| `date_format` | string \| boolean  |                                  | A dayjs format string for the date portion. `true` uses the default `YYYY-MM-DD` preset. `false` drops the date portion entirely and switches the input to a pure `time` picker. |
| `time_format` | string \| boolean  |                                  | A dayjs format string for the time portion. `true` uses the default `HH:mm` preset. `false` drops the time portion entirely and switches the input to a pure `date` picker.       |
| `picker_utc`  | boolean            | `false`                         | Store and display the value in UTC instead of local time. Also escapes any literal `Z` in `format`/`date_format`/`time_format` so it's rendered as a literal character rather than being interpreted by dayjs as a UTC-offset token.                    |

### Deprecated camelCase aliases

`dateFormat`, `timeFormat`, and `pickerUtc` are deprecated aliases for `date_format`, `time_format`, and `picker_utc`. They're silently normalised to their snake_case equivalents at runtime, so existing configs keep working, but new configs should use the snake_case keys.

## Examples

### Default (no options)

With no options set, the widget stores an ISO-8601 datetime and shows a combined date + time picker.

```yaml
- label: 'Published'
  name: 'date'
  widget: 'datetime'
```

Stores: `2023-08-13T09:30:00.000Z`

### Custom `format`

`format` takes full control of the stored/displayed value and always uses a combined `datetime-local` input.

```yaml
- label: 'Published'
  name: 'date'
  widget: 'datetime'
  format: 'DD/MM/YYYY HH:mm'
```

Stores: `13/08/2023 09:30`

### Split `date_format` / `time_format`

Set `date_format` and/or `time_format` to control each half independently, or set one to `false` to drop it and switch to a single-purpose `date` or `time` input.

```yaml
# combined, custom formats for each half
- label: 'Published'
  name: 'date'
  widget: 'datetime'
  date_format: 'DD/MM/YYYY'
  time_format: 'HH:mm'
```

```yaml
# date only — time_format: false switches the input to a pure `date` picker
- label: 'Published date'
  name: 'date'
  widget: 'datetime'
  time_format: false
```

```yaml
# time only — date_format: false switches the input to a pure `time` picker
- label: 'Published time'
  name: 'date'
  widget: 'datetime'
  date_format: false
```

### `picker_utc`

```yaml
- label: 'Published'
  name: 'date'
  widget: 'datetime'
  picker_utc: true
```

Stores/displays the value in UTC rather than the browser's local time zone. Any literal `Z` in a custom `format`, `date_format`, or `time_format` is escaped so it prints as a literal `Z` instead of being read as a dayjs UTC-offset token.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
