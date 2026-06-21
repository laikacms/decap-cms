# decap-cms-widget-number

Number widget for [Decap CMS](https://decapcms.org).

## Configuration options

| Option       | Type    | Default | Description |
|-------------|---------|---------|-------------|
| `label`      | string  | Field `name` | Label for the field in the editor UI. |
| `name`       | string  | —       | Unique field identifier. |
| `default`    | number  | —       | Default value. |
| `value_type` | string  | —       | How the stored value is typed. Valid values: `int`, `float`. When omitted, the value is stored as an integer via `parseInt`. |
| `min`        | number  | —       | Minimum allowed value. |
| `max`        | number  | —       | Maximum allowed value. |
| `step`       | number \| `'any'`  | `1` for `int`, `any` for `float` or omitted | Input step size. Use `'any'` to allow any decimal value. |

### `value_type` behavior

- `int` — stored as integer (`parseInt`)
- `float` — stored as float (`parseFloat`)
- omitted — stored as integer (`parseInt` fallback; **not** a string)

> **Note:** Only `int` and `float` are valid `value_type` values. Any other value is rejected by schema validation.

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
