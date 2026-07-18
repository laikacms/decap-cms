# Number widget

The number widget renders a native `<input type="number">` and stores either a JavaScript `number`
or, for values that can't be safely represented as one, the raw string the editor typed.

## Config

```yaml
- { label: 'Priority', name: 'priority', widget: 'number', value_type: 'int', min: 1, max: 5 }
```

- `value_type` (optional, one of `'int'` or `'float'`, default `'float'`) — controls both parsing
  and the rendered `step`. Read as `field.value_type` in `NumberControl.tsx`; any value other than
  the literal string `'int'` (including unset/`undefined`) takes the float path.
  - `'int'` — input renders `step="1"`. Typed values are parsed with `parseInt`. If the parsed
    integer exceeds `Number.MAX_SAFE_INTEGER` (i.e. `parseInt` would have silently rounded it), the
    raw string is stored instead of the rounded number, and `isValid()` reports a
    "Value exceeds the maximum safe integer. Use a string widget for arbitrary-precision IDs."
    error rather than persisting the corrupted value.
  - `'float'` / unset — input renders `step="any"`. Typed values are parsed with `parseFloat`,
    preserving decimals. If the parsed value overflows to `Infinity`/`-Infinity` (e.g. `1e309`),
    the raw string is stored instead, and `isValid()` reports a
    "Value exceeds the maximum representable number." error.
- `step` (optional) — overrides the `step` attribute on the `<input>`. When unset, `step` defaults
  to `1` for `value_type: 'int'` and `any` otherwise.
- `min` / `max` (optional) — numeric bounds. Enforced on save via `validateMinMax`, which emits a
  translated range/min/max validation error when the value falls outside the bounds; not enforced
  as the user types.
- `default` (optional) — pre-filled value for new entries.

Note: `CmsFieldNumber` also has a deprecated `valueType` (camelCase) type field, but nothing in the
widget reads it — only the snake_case `value_type` documented above has any effect.
