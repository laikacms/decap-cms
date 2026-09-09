# Autoincrement widget

The autoincrement widget renders a numeric input pre-filled with `max(existing values for this
field across the collection) + 1`. It's meant for sequential ids (ticket numbers, order numbers)
that shouldn't be hand-typed.

## Config

```yaml
- { label: 'Ticket ID', name: 'ticketId', widget: 'autoincrement' }
- { label: 'Order #', name: 'orderNumber', widget: 'autoincrement', start: 1000 }
- { label: 'Ref', name: 'ref', widget: 'autoincrement', read_only: false }
```

- `start` (optional, default `1`) — value assigned to the first entry created in the collection,
  used only while no other entry has a value for this field yet. Once any entry has a value, new
  entries get `max(existing) + 1` regardless of `start`.
- `read_only` (optional, default `true`) — renders the input `readOnly` so editors can't hand-edit
  the assigned value. Set to `false` to allow manual overrides.

## Computation

Source: `core/actions/entries.tsx` (`createEmptyDraft`), `core/lib/computeAutoincrementValues.ts`.

Unlike most widgets, the value isn't computed by the control component. Finding the current max
requires scanning every other entry already loaded for the collection — state an individual field
widget doesn't have access to (the same reason `unique: true` field validation lives in
`core/actions/entries.tsx` rather than in a widget). Instead, `createEmptyDraft` computes the value
once, when a brand-new entry's draft is created, and writes it directly into the draft data before
the control ever mounts. `AutoincrementControl` only displays that value (and, when
`read_only: false`, lets an editor type over it) — it never generates or recomputes a value itself,
so it won't change on every render or when the user edits an unrelated field.

Existing entries that predate the field are left untouched (not backfilled) — the same convention
`unique: true` follows, and consistent with `withDefaultsBackfilled` only filling in genuinely
missing keys rather than mutating field semantics after the fact.

## Known limitation

Duplicating an entry (`createDraftDuplicateFromEntry`) copies the source entry's data verbatim,
including its autoincrement value, rather than recomputing it. Combine the field with `unique: true`
to have `persistEntry` reject the collision at save time; recomputing on duplicate is out of scope
for this slice (DCMS-1422).
