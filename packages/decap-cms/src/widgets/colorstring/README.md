# Color widget

Shows a color swatch that opens a picker ([`react-colorful`](https://www.npmjs.com/package/react-colorful))
and a text input for the color value. Registered as `widget: 'color'` (the source directory is
still named `colorstring` from before the widget was renamed).

## Config

```yaml
- label: 'Accent color'
  name: 'accent_color'
  widget: 'color'
  default: '#000000'
  allowInput: true
  enableAlpha: true
```

- `default` (optional) — initial value for a new entry. Standard widget-level default handling; no
  color-specific parsing is applied to it.
- `allowInput` (optional, default `false`) — controls whether the text input is editable. Source:
  `ColorControl.tsx`.
- `enableAlpha` (optional, default `false`) — controls whether the alpha channel is editable and
  which string format is stored. Source: `ColorControl.tsx`.

There is no snake_case (`allow_input` / `enable_alpha`) alias and no normalization layer — the type
(`CmsFieldColor` in `src/lib/util/types/cms/fields/color.ts`) only declares the camelCase keys
above, and `ColorControl.tsx` reads `field.allowInput` / `field.enableAlpha` directly.

## `allowInput`

When `false` (the default):

- The text input is `readOnly`.
- Clicking the text input opens the color picker (same as clicking the swatch).
- A clear button is shown next to the input whenever there is a non-empty value, letting the editor
  reset the field to `''` without being able to type a value directly.

When `true`:

- The text input is editable, so the editor can type or paste a color value directly.
- The clear button is not shown (an editable input doesn't need one).

## `enableAlpha`

When `false` (the default):

- The picker is `HexColorPicker`, and picked colors are stored as-is (hex, no alpha).

When `true`:

- The picker is `RgbaStringColorPicker`.
- A picked color is re-parsed with `tinycolor`: if its alpha is `< 1` it's stored as an
  `rgba(...)` string, otherwise it's stored as a hex string. This means a fully-opaque color picked
  with `enableAlpha: true` still ends up stored as hex, not `rgba(r, g, b, 1)`.

Whichever picker is active also determines the color format shown to seed it: the current value is
parsed and re-serialized as `rgba(...)` when `enableAlpha` is `true`, or as hex otherwise. An
invalid/unparsable value falls back to `rgba(0, 0, 0, 1)` (alpha picker) or `#000000` (hex picker).

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
