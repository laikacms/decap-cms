# decap-cms-widget-colorstring

The Color widget translates a color picker UI into a hex or `rgba()` string value.

## Options

| Name           | Type    | Default | Description                                                                                  |
| -------------- | ------- | ------- | ---------------------------------------------------------------------------------------------- |
| `allow_input`  | boolean | `false` | Allow typing a color value directly into the text input                                        |
| `enable_alpha` | boolean | `false` | Show an alpha (transparency) slider in the color picker and allow storing an `rgba()` value     |

```yaml
- label: 'Accent Color'
  name: 'color'
  widget: 'color'
  allow_input: true
  enable_alpha: true
```

### `allow_input`

When `allow_input` is `false` (the default), the text input is `readOnly` — clicking it opens the color picker instead of accepting typed input, and a clear (×) button is shown next to the input when a value is set. When `allow_input` is `true`, the input becomes editable and the clear button is hidden, since the value can be edited or removed directly.

### `enable_alpha`

When `enable_alpha` is `false` (the default), the color picker's alpha slider is disabled and the widget stores a hex string (e.g. `#ff0000`). When `enable_alpha` is `true`, the alpha slider is shown and, if the selected color's alpha is less than 1, the widget stores an `rgba(r, g, b, a)` string instead of hex.

### Deprecated aliases

The camelCase field options `allowInput` and `enableAlpha` are deprecated aliases for `allow_input` and `enable_alpha` respectively. They are still read for backwards compatibility, but if both the snake_case and camelCase forms are set, the snake_case option takes precedence. New configs should use `allow_input` / `enable_alpha`.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
