# decap-cms-widget-number

Number widget for [Decap CMS](https://decapcms.org).

## Configuration options

| Option       | Type    | Default | Description |
|-------------|---------|---------|-------------|
| `label`      | string  | Field `name` | Label for the field in the editor UI. |
| `name`       | string  | —       | Unique field identifier. |
| `default`    | number  | —       | Default value. |
| `value_type` | string  | —       | How the stored value is typed. Valid values: `int`, `float`. When omitted, the value is stored as an integer via `parseInt`, except when the entered digits exceed `Number.MAX_SAFE_INTEGER` (see below). |
| `min`        | number  | —       | Minimum allowed value. |
| `max`        | number  | —       | Maximum allowed value. |
| `step`       | number \| `'any'`  | `1` for `int`, `any` for `float` or omitted | Input step size. Use `'any'` to allow any decimal value. |

### `value_type` behavior

- `int` — stored as integer (`parseInt`)
- `float` — stored as float (`parseFloat`)
- omitted — stored as integer (`parseInt` fallback; **not** a string)

> **Note:** Only `int` and `float` are valid `value_type` values. Any other value is rejected by schema validation.

### Unsafe integer exception

For `int` (and omitted) `value_type`, `parseInt` silently rounds digit strings once they exceed
`Number.MAX_SAFE_INTEGER`, which would corrupt the entered value. To avoid that, the widget
detects this case and keeps the **raw input string** instead of coercing it to a (corrupted)
number. The field's `isValid()` check then flags the stored string as a `CUSTOM` range error
("Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs."),
so the out-of-range entry is surfaced to the user rather than silently saved as wrong data.
`float` fields are not affected by this guard.

## Example

```yaml
- label: "Count"
  name: "count"
  widget: "number"
  value_type: "int"
  min: 0
  max: 100
  step: 1
```
