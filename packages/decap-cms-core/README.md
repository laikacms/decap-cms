# Docs coming soon!

Decap CMS was converted from a single npm package to a "monorepo" of over 20 packages.
We haven't created a README for this package yet, but you can:

1. Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the [documentation
   site](https://www.decapcms.org) for more info.
2. Reach out to the [community chat](https://decapcms.org/chat/) if you need help.
3. Help out and [write the readme yourself](https://github.com/decaporg/decap-cms/edit/main/packages/decap-cms-core/README.md)!

## Dynamic default values: query-param coercion and multi-value fields

`createEmptyDraft` (`src/actions/entries.ts`) prefills a new entry's field
defaults from the "new entry" URL's query string, as described in the
[Dynamic Default Values](https://decapcms.org/docs/dynamic-default-values/)
doc (e.g. `/#/collections/posts/new?title=first&object.title=second`). Two
behaviors beyond plain string prefill aren't covered there:

- **Boolean coercion.** A query value that case-insensitively matches `true`
  (`true`, `True`, `TRUE`) or `false` (`false`, `False`, `FALSE`) is coerced
  to the real JS boolean `true`/`false` before being written into the
  field's `default`, not left as the string `"true"`/`"false"`. This applies
  to any field, but is most relevant for `widget: boolean` fields:

  ```
  /#/collections/posts/new?published=TRUE
  ```

  sets `default: true` (boolean) on a `published` field with
  `widget: boolean`.

- **Comma-separated / repeated params for `multiple: true` fields.** For a
  field configured with `multiple: true` (e.g. `select` or `relation`
  widgets), the query value(s) for that key are split on commas, all
  repeated `key=` params are flattened together, and each resulting value
  is passed through the same boolean coercion above; the result becomes a
  `List` default:

  ```
  /#/collections/posts/new?tags=a,b,c
  ```

  and

  ```
  /#/collections/posts/new?tags=a&tags=b,c
  ```

  both prefill a `multiple: true` `tags` field with the list
  `['a', 'b', 'c']`.
