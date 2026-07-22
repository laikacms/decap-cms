# decap-cms-widget-number

Number widget for [Decap CMS](https://decapcms.org).

## Configuration options

| Option       | Type    | Default | Description |
|-------------|---------|---------|-------------|
| `label`      | string  | Field `name` | Label for the field in the editor UI. |
| `name`       | string  | —       | Unique field identifier. |
| `default`    | number  | —       | Default value. |
| `value_type` | string  | —       | How the stored value is typed. Valid values: `int`, `float`. When omitted, the value is stored as a float via `parseFloat` (same path as `float`), except when the result is non-finite or exceeds `Number.MAX_SAFE_INTEGER` (see below). |
| `min`        | number  | —       | Minimum allowed value. |
| `max`        | number  | —       | Maximum allowed value. |
| `step`       | number \| `'any'`  | `1` for `int`, `any` for `float` or omitted | Input step size. Use `'any'` to allow any decimal value. |

### `value_type` behavior

- `int` — stored as integer (`parseInt`)
- `float` — stored as float (`parseFloat`)
- omitted — stored as float (`parseFloat`, same code path as `float`; **not** `parseInt`)

> **Note:** Only `int` and `float` are valid `value_type` values. Any other value is rejected by schema validation.
> The decapcms.org widget docs currently say "any other value results in saving as a string" —
> that description is outdated for this codebase and needs a correction in the
> [decap-website](https://github.com/decaporg/decap-website) repo (`content/docs/widgets/number.md`).

### Deprecated camelCase alias

`valueType` is a deprecated camelCase alias for `value_type`. It is **not** inert: config
normalization (`normalizeConfig`/`setSnakeCaseConfig` in `decap-cms-core`) copies any present
`valueType` onto `value_type` for every field at config-load time, logging a `console.warn`
deprecation notice, before the widget ever reads the field. So `{ widget: 'number', valueType:
'int' }` behaves identically to `{ widget: 'number', value_type: 'int' }` — same `parseInt`
parsing path, same `step="1"` default. Prefer `value_type` in new configs.

### Unsafe integer exception

For `int` `value_type`, `parseInt` silently rounds digit strings once they exceed
`Number.MAX_SAFE_INTEGER`, which would corrupt the entered value. To avoid that, the widget
detects this case and keeps the **raw input string** instead of coercing it to a (corrupted)
number. The field's `isValid()` check then flags the stored string as a `CUSTOM` range error
("Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs."),
so the out-of-range entry is surfaced to the user rather than silently saved as wrong data.

For `float` (and omitted) `value_type`, the equivalent guard is on `parseFloat`'s result instead:
if the parsed value is non-finite (e.g. an entry like `1e309` that overflows to `Infinity`), the
widget keeps the raw input string and `isValid()` flags it as a `CUSTOM` error ("Value exceeds
the maximum representable number."). A digit string that parses to a safe finite float but is
itself outside `Number.MAX_SAFE_INTEGER` is caught the same way as the `int` case above, reusing
the "maximum safe integer" message.

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
