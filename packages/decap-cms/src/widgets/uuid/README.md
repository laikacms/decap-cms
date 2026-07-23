# UUID widget

The uuid widget renders a text input pre-filled with a generated UUID v4 the first time the field
mounts with no value. It's meant for stable content ids (slugs, external keys) that shouldn't be
hand-typed.

## Config

```yaml
- { label: 'ID', name: 'id', widget: 'uuid' }
- { label: 'Post ID', name: 'id', widget: 'uuid', prefix: 'post/', read_only: false }
- { label: 'Short ID', name: 'shortId', widget: 'uuid', use_b32_encoding: true }
```

- `prefix` (optional, default `''`) — string prepended to the generated UUID.
- `read_only` (optional, default `true`) — renders the input `readOnly` so editors can't hand-edit
  the generated id. Set to `false` to allow manual overrides.
- `use_b32_encoding` (optional, default `false`) — encodes the UUID as lowercase, unpadded RFC 4648
  Base32 instead of the canonical hex form (shorter, case-insensitive-safe for use in URLs/slugs).

## Generation

Source: `UuidControl.tsx`.

A UUID is generated via `crypto.randomUUID()` exactly once, in the effect that runs on mount, and
only when the field has no existing value. Existing values (loaded entries, or values already set
by another widget) are never overwritten.

For i18n-enabled collections, generation is skipped for non-default locales unless the field is
explicitly `i18n: translate` — otherwise every locale of the same entry would mint its own id for
what should be one shared identifier.

## Cursor-preserving onChange

Same rationale and mechanism as the string widget (see `widgets/string/README.md`): a pending
selection is recorded on user-initiated changes and reapplied after re-render, so the widget stays
editable when nested inside another widget's editor when `read_only: false`.

Ported from decaporg/decap-cms#6675 (upstream commit `78c079313`).
