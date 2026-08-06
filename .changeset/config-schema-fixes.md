---
'@laikacms/decap-cms': patch
---

Fix `config.schema.json`: pin the `sortableFields` alias alongside `sortable_fields`, and remove
the nonexistent `icon-picker` value from the widget enum (the shipped widgets are `lucide-icon` and
`radix-icon`).
