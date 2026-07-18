# `src/lib/widgets/` — string templates and widget-shared helpers

This package holds logic shared across widgets and collection config that isn't specific to any one
widget's UI: the `{{ field }}` string-template compiler (`stringTemplate.ts`) and field validation
helpers (`validations.ts`).

## Template Filters

Several config keys accept a **string template**: a plain string containing `{{ field }}`
placeholders that get replaced with entry data when the template is compiled. The placeholder syntax
also supports an optional `| filter` suffix that transforms the replacement value before it's
inserted:

```yaml
summary: '{{ fields.title | upper }} — {{ fields.published | date("YYYY-MM-DD") }}'
```

Everywhere `{{ field }}` placeholders are accepted, `{{ field | filter }}` is too:

- **Collection `slug`** — the per-collection slug template (`collections[].slug`, e.g.
  `'{{year}}-{{month}}-{{title}}'`; see the
  [core README's top-level `slug` config section](../../core/README.md#top-level-slug-config) for
  how this differs from the sanitization-only top-level `slug` object).
- **List widget `summary`** — the label shown for a collapsed list item (see
  [`src/widgets/list/README.md`](../../widgets/list/README.md)).
- **Object widget `summary`** — the label shown for a collapsed object field.
- **Relation widget `display_fields`** and **`value_field`** — the fields shown in / stored from a
  relation search result (see [`src/widgets/relation/README.md`](../../widgets/relation/README.md)).

All of the above are compiled through `compileStringTemplate` in
[`stringTemplate.ts`](./stringTemplate.ts).

### Syntax

```
{{ field | filterName('arg1', 'arg2') }}
```

- `field` — a dot/bracket path into the entry data (e.g. `title`, `fields.slug`, `author.name`), or
  one of the built-in placeholders (`year`, `month`, `day`, `hour`, `minute`, `second`, `slug`)
  resolved against the identifier/date passed to `compileStringTemplate`.
- `| filterName(...)` is optional. When present, exactly **one** filter is applied to the
  stringified replacement value — filters cannot be chained (`{{ field | upper | lower }}` does not
  apply either filter, because the filter pattern is matched against the _entire_ text after the
  first `|`, and none of the six patterns below match `upper | lower`).
- If the filter text after `|` doesn't match any of the six patterns below (typo, unknown filter,
  wrong argument syntax), it is silently ignored and the unfiltered value is used.

### The six filters

All filters are defined as `{ pattern, transform }` pairs in the `filters` array in
[`stringTemplate.ts`](./stringTemplate.ts):

| Filter   | Syntax                                          | Behavior                                                                                                                                                                                                                        |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upper    | `\| upper`                                      | Uppercases the value via `String.prototype.toUpperCase`.                                                                                                                                                                        |
| Lower    | `\| lower`                                      | Lowercases the value via `String.prototype.toLowerCase`.                                                                                                                                                                        |
| Date     | `\| date('FORMAT')`                             | Formats the value as a date using [dayjs](https://day.js.org/docs/en/display/format), e.g. `dayjs(value).format('YYYY-MM-DD')`. `FORMAT` is a dayjs format string and must be single-quoted.                                    |
| Default  | `\| default('fallback')`                        | Substitutes the literal string `fallback` when the raw field value is falsy (`null`, `undefined`, `false`, or `''`) — an empty array or the number `0` are **not** falsy for this check. Otherwise the value is left unchanged. |
| Ternary  | `\| ternary('a','b')`                           | Yields `a` when the raw field value is truthy, `b` when it's falsy (same falsy check as `default`). Note the argument order: truthy value first.                                                                                |
| Truncate | `\| truncate(N)` or `\| truncate(N,'omission')` | Truncates the value to `N` characters (via lodash `truncate`) plus the omission length, appending the `omission` string (default `'...'`) when truncated.                                                                       |

Examples (see
[`src/lib/widgets/__tests__/stringTemplate.spec.ts`](./__tests__/stringTemplate.spec.ts) for the
executable versions of these):

```
{{ slug | upper }}                          → BACKENDSLUG
{{ title | lower }}                         → title
{{ published | date('MM-DD') }}             → 01-02
{{ subtitle | default('none') }}            → none            (when subtitle is falsy)
{{ starred | ternary('star️','nostar') }}    → star️             (when starred is truthy)
{{ slug | truncate(6) }}                    → backen...        (for slug = 'entrySlug')
{{ slug | truncate(3,'***') }}              → bac***           (for slug = 'entrySlug')
```

### Notes

- The `date` filter formats whatever value is at `field` (or the entry's configured date, when
  `field` is a recognized date placeholder) — it does **not** parse arbitrary strings beyond what
  `dayjs()` accepts.
- `default` and `ternary` check the **raw** field value for falsiness (before it's stringified), so
  an object/array field that resolves to `'[object
  Object]'` or `'[]'` when stringified is still
  evaluated as truthy/falsy based on the original value.
- A custom `processor` callback passed to `compileStringTemplate` (used internally for slug
  sanitization) **composes** with filters rather than suppressing them: when both a `| filter`
  suffix and a `processor` are present, the filter always runs first, and `processor` then runs on
  the filter's output. The `| filter` suffix is never ignored just because a `processor` is
  supplied.
