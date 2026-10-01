# Number widget

The number widget renders a native `<input type="number">` and stores either a JavaScript `number`
or, for values that can't be safely represented as one, the raw string the editor typed. The raw
string is stored in three cases, each surfaced by `isValid()` as a custom error:

| Input                                                  | Stored as  | `isValid()` error                                                                          |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------ |
| Integer above `Number.MAX_SAFE_INTEGER`                | raw string | `Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs.` |
| Magnitude that overflows to `Infinity` (e.g. `1e309`)  | raw string | `Value exceeds the maximum representable number.`                                          |
| Input that doesn't parse at all (`-`, `e`, `.`, `--5`) | raw string | `Value is not a valid number.`                                                             |

Clearing the field stores `''`, which only triggers the `required` error. These three messages are
hardcoded English and are **not translated** (unlike the `min`/`max` range errors).

## Config

```yaml
- { label: 'Priority', name: 'priority', widget: 'number', value_type: 'int', min: 1, max: 5 }
- { label: 'Volume', name: 'volume', widget: 'number', min: 0, max: 100, step: 1, slider: true }
```

- `value_type` (optional, one of `'int'` or `'float'`, default `'float'`) — controls both parsing
  and the rendered `step`. Read as `field.value_type` in `NumberControl.tsx`; any value other than
  the literal string `'int'` (including unset/`undefined`) takes the float path.
  - `'int'` — input renders `step="1"`. Typed values are parsed with `parseInt`. If the parsed
    integer exceeds `Number.MAX_SAFE_INTEGER` (i.e. `parseInt` would have silently rounded it), the
    raw string is stored instead of the rounded number, and `isValid()` reports a "Value exceeds the
    maximum safe integer. Use a string widget for arbitrary-precision IDs." error rather than
    persisting the corrupted value.
  - `'float'` / unset — input renders `step="any"`. Typed values are parsed with `parseFloat`,
    preserving decimals. If the parsed value overflows to `Infinity`/`-Infinity` (e.g. `1e309`), the
    raw string is stored instead, and `isValid()` reports a "Value exceeds the maximum representable
    number." error. Integer-looking input beyond `Number.MAX_SAFE_INTEGER` (e.g. 25 digits) is
    likewise stored raw and reported with the "maximum safe integer" error instead of being rounded
    (`1e+25`).
- `step` (optional) — overrides the `step` attribute on the `<input>`. When unset, `step` defaults
  to `1` for `value_type: 'int'` and `any` otherwise.
- `min` / `max` (optional) — numeric bounds. Enforced on save via `validateMinMax`, which emits a
  translated range/min/max validation error when the value falls outside the bounds; not enforced as
  the user types. This runs independently of `pattern` (a generic `CmsFieldBase` option) — combining
  both on a `number` field enforces both checks, and each surfaces its own validation error.
- `slider` (optional, boolean, default `false`) — when `true`, renders a native range slider input
  alongside the number input, sharing the same `min`/`max`/`step` values (falling back to a
  `0`-`100` range when `min`/`max` are unset). Both inputs stay in sync through the same `onChange`
  handler.
- `default` (optional) — pre-filled value for new entries.

### Deprecated camelCase alias

`valueType` is a deprecated camelCase alias for `value_type`. It is **not** inert: config
normalization (`normalizeConfig`/`setSnakeCaseConfig`/`WIDGET_KEY_MAP` in
`src/core/actions/config.tsx`) copies any present `valueType` onto `value_type` for every field at
config-load time, logging a `console.warn` deprecation notice, before `NumberControl` ever reads the
field. So `{ widget: 'number', valueType: 'int' }` behaves identically to `{ widget: 'number',
value_type: 'int' }` — same `parseInt` parsing path, same `step="1"` default. Prefer `value_type` in
new configs.
