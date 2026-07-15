# decap-cms-widget-text

Text widget for [Decap CMS](https://decapcms.org). Renders a multi-line, auto-growing
textarea (via [`react-textarea-autosize`](https://github.com/Andarist/react-textarea-autosize))
for freeform plain-text content — the multi-line counterpart to the single-line
[`string`](../decap-cms-widget-string) widget.

## Configuration options

| Option     | Type    | Default | Description |
|------------|---------|---------|-------------|
| `label`    | string  | Field `name` | Label for the field in the editor UI. |
| `name`     | string  | —       | Unique field identifier. |
| `default`  | string  | —       | Initial value for a new entry. |
| `pattern`  | `[string \| RegExp, string]` | — | `[regex, error message]` tuple. The entered value must match `regex` or the field fails validation and the error message is shown. |
| `required` | boolean | `true`  | Whether the field must have a non-empty value to save the entry. |
| `hint`     | string  | —       | Instructional text rendered under the field label in the editor UI. |

```yaml
- label: 'Description'
  name: 'description'
  widget: 'text'
  default: 'Write a short summary here.'
  pattern: ['.{1,500}', 'Must be 500 characters or fewer']
  hint: 'Shown in list views and search results.'
```

## Behavior notes

### Always re-renders (`shouldComponentUpdate` returns `true`)

Most Decap CMS widget controls skip re-rendering when their props haven't
meaningfully changed. `TextControl` opts out of that optimization entirely —
`shouldComponentUpdate()` always returns `true` — so it re-renders on every parent
update regardless of whether `value` or other props actually changed.

This is deliberate, not an oversight: `react-textarea-autosize` recalculates the
textarea's height based on its rendered DOM state, and certain situations — most
notably this widget being nested inside a list item that gets reordered — can leave
the textarea stuck at a minimal height if a render is skipped. Always updating avoids
that class of bug at the cost of some extra re-renders, which is normally low-cost for
a single textarea. This tradeoff is a candidate for future optimization if it ever
shows up as a performance problem.

### Bidi control character warning

If `value` contains an invisible Unicode bidirectional control character (e.g. `U+202E`
RIGHT-TO-LEFT OVERRIDE), the widget renders a `⚠` warning badge (`role="alert"`) next
to the textarea. These characters can make the displayed text render very differently
from how it's actually stored — a technique known as
["Trojan Source"](https://trojansource.codes/) that can be used to spoof file names,
titles, or other content. The warning is purely informational: it does not strip,
block, or otherwise modify the value, so review the raw text carefully if the badge
appears. This is the same detection (`bidiControls.containsBidiControls`, from
`decap-cms-lib-widgets`) used by the [`string`](../decap-cms-widget-string) widget.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
