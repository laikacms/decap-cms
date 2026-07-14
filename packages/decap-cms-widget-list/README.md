# decap-cms-widget-list

The List widget allows you to author a repeatable list of items.

## Options

| Name                 | Type              | Default | Description                                                                                                                                                           |
| -------------------- | ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow_add`          | boolean           | `true`  | Allow adding new list items                                                                                                                                           |
| `allow_remove`       | boolean           | `true`  | Allow removing list items                                                                                                                                             |
| `allow_reorder`      | boolean           | `true`  | Allow reordering list items                                                                                                                                           |
| `collapsed`          | boolean           | `false` | Render list items collapsed by default                                                                                                                                |
| `summary`            | string            |         | Template for the summary shown on collapsed list items                                                                                                                |
| `minimize_collapsed` | boolean           | `false` | Render a minimized, single-line summary for collapsed list items                                                                                                      |
| `label_singular`     | string            |         | Singular label used for the "Add" button and heading when there is 1 item                                                                                             |
| `label_plural`       | string            |         | Plural label used for the heading when there are 0 or 2+ items. Defaults to `label` if set, otherwise a naive English pluralization of `name` (e.g. `list` → `lists`) |
| `i18n`               | boolean or string |         | i18n behavior for this field: `true`, `translate`, `duplicate`, or `none`                                                                                             |
| `min`                | integer           |         | Minimum number of list items. Independent of `max` — may be set alone.                                                                                                |
| `max`                | integer           |         | Maximum number of list items. Independent of `min` — may be set alone.                                                                                                |
| `add_to_top`         | boolean           | `false` | Add new list items to the top of the list instead of the bottom                                                                                                       |
| `typeKey`            | string            | `type`  | Key used to identify the widget/type of a variable list item                                                                                                          |

### `min` and `max`

`min` and `max` do not require each other. You may set:

- only `min`, to enforce a lower bound on the number of items,
- only `max`, to enforce an upper bound on the number of items, or
- both, to enforce a range.

See `validateMinMax` in `decap-cms-lib-widgets` for the validation logic.

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
