# Checkbox Group

Status: rejected

Base UI's Checkbox Group (`@base-ui/react/checkbox-group`) provides shared state for a set of
`Checkbox.Root`s: a `value: string[]` / `onValueChange` array API keyed by each checkbox's `value`
prop, optional parent-checkbox support (`allValues` plus `<Checkbox.Root parent>`) with automatic
indeterminate state, submission of the group under one `name` inside a Form/Field, and group
labeling via `aria-labelledby`.

## Findings: no grouped checkboxes exist in this repo

- Zero imports of `@base-ui/react/checkbox-group` (and none of `@base-ui/react/checkbox` either; see
  `checkbox.md` for that component's own status).
- The repo's checkbox instances are all solitary, never a set sharing state:
  - `src/ui/Checkbox.tsx`, whose only consumer is a single "include time" toggle
    (`src/ui/editor/editor-ui/DateTimeComponent.tsx:217`).
  - decorative read-only checkboxes inside menu items (`src/ui/default/Dropdown.tsx:264-301`) and
    `Menu.CheckboxItem` usage in `src/ui/DropdownMenu.tsx:169-194`, both menu concerns.
- Multi-value selection in content fields is the `select` widget with `multiple: true`, rendered by
  `react-select` (`src/widgets/select/SelectControl.tsx`), and the `relation` widget, also
  react-select based (`src/widgets/relation/RelationControl.tsx`). Neither renders checkboxes; both
  are validated by the CMS engine (`validations.validateMinMax`), not by form semantics.
- There is no bulk-selection UI (select-all over entry listings) in either the classic shell or the
  Laika dashboard today; `src/laika-app/` list views navigate rather than select.

## Motivation for rejection

A group primitive with zero groups to manage is dead weight. The two plausible future consumers are:

1. Bulk entry selection in the Laika shell (select-all with indeterminate parent state over
   dashboard/workflow lists). This is exactly Checkbox Group's parent-checkbox feature and is the
   trigger to adopt it, but that UX does not exist yet; `checkbox.md` already flags this same future
   need when proposing the `src/ui/Checkbox.tsx` rebase, which should land first since Checkbox
   Group composes `Checkbox.Root` parts.
2. A checkbox-list rendering mode for low-cardinality `select multiple` widget fields. That would be
   a new widget feature riding on the CMS's own validation, where the group's native form submission
   adds little; nothing indicates this is planned.

Revisit when either surface materializes; until then there is nothing to wrap.
