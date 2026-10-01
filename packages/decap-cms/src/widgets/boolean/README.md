# Boolean widget

The boolean widget renders a single on/off toggle switch for a true/false value.

## Config

```yaml
- { label: 'Featured', name: 'featured', widget: 'boolean', default: false }
```

- `default` (optional) — pre-filled value (`true` or `false`) for new entries.
- `required` (optional, default `true`) — whether the field must be filled in before the entry can
  be saved. Set to `false` to mark the field optional; this is threaded onto the toggle as
  `aria-required` (see below).
- `hint` (optional) — helper text rendered alongside the field label.

## Unset value is seeded as `false`

Source: `createEmptyDraftData` in `src/core/actions/entries.tsx`, `BooleanControl.tsx`.

If a field has no `default:` key in its config, `createEmptyDraftData` seeds `false` into the draft
(for new entries, nested object/list items, and as a backfill for existing entries that lack the
key). The toggle therefore renders **unchecked** and the draft really holds `false`, so a
required-by-default boolean passes the presence validator when saved untouched. `BooleanControl`
keeps its `value = false` render default as a safety net. There is no three-state ("unset")
rendering: the toggle is always either on or off. An explicit `default:` always wins over the seed.

## Toggle UI

The control renders a `Toggle` (`src/ui/default/Toggle.tsx`), a switch-style button, not a
`<input type="checkbox">`. The rendered element is a `<button>` with `role="switch"` semantics (via
the shared `Switch` primitive in `src/ui/Toggle.tsx`); `checked` mirrors the `value` prop directly,
so the visual state always matches the field's current value, on every re-render.

## Accessibility wiring (DCMS-1086)

`BooleanControl` threads validation state onto the underlying toggle button:

- `aria-required` — `true` unless the field explicitly sets `required: false`.
- `aria-invalid` / `aria-errormessage` — set when the field has a validation error, pointing at the
  error list rendered for the field.

A `false` value alone cannot currently fail the presence validator (`false` is still a "present"
value for this widget), so `aria-invalid` only appears once the field carries an unrelated error
condition.
