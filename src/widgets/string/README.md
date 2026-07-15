# String widget

The string widget renders a plain `<input type="text">` for a single-line
value. It is the CMS's default widget: a field with no `widget` key is
treated as `string`.

## Config

```yaml
- { label: 'Title', name: 'title', widget: 'string', default: 'New Post' }
```

- `default` (optional) — pre-filled value for new entries.
- `pattern` (optional) — `[regex, message]`; the field fails validation when
  the value doesn't match `regex`, and `message` is shown as the error.
- `required` (optional, default `true`) — whether the field must be filled
  in before the entry can be saved.
- `hint` (optional) — helper text rendered alongside the field label.

(`text` is a related widget for multi-line values; it shares this config
shape but renders a `<textarea>`.)

## Cursor-preserving onChange

Source: `StringControl.tsx`.

On every keystroke, `handleChange` records the input's `selectionStart`
into a ref (`pendingSelection`) before calling `onChange`. After the
resulting re-render, an effect restores the caret to that recorded position
via `setSelectionRange` if it drifted.

This exists because the string widget can be nested inside another widget's
editor (for example, as the alt-text input for a block image inside a
richtext widget). Without manually re-applying the selection, a
programmatic re-render of the parent editor after `onChange` can otherwise
reset the input's caret to the end of the value, making it impossible to
edit in the middle of the text. See decaporg/decap-cms#4539 and
decaporg/decap-cms#3578.

The selection is only reapplied when a pending selection was recorded by a
user-initiated change — the initial mount and any external/programmatic
value update (not originating from `handleChange`) leave the browser's
native caret behavior untouched.

## Bidi Trojan-Source warning

Source: `bidiControls.containsBidiControls` (`src/lib/widgets/bidiControls.ts`).

If the field's raw string value contains a Unicode bidirectional
control character (`U+061C`, `U+202A`–`U+202E`, or `U+2066`–`U+2069`), the
widget renders a `⚠` warning span (`role="alert"`) next to the input, with a
tooltip explaining the risk.

These control characters can reorder how surrounding text is *displayed*
without changing the underlying code points — the technique behind
"Trojan Source" spoofing (CVE-2021-42574). A value like
`admin<RLO>txt.exe` (where `<RLO>` is `U+202E RIGHT-TO-LEFT OVERRIDE`) can
render as `admin exe.txt`, making a malicious file name or title look
legitimate at a glance.

The widget only **warns** — it never strips or mutates the value.
Editors should review the raw value carefully before saving when this
warning appears. A `stripBidiControls` helper exists in
`bidiControls.ts` for opt-in, collection-level sanitization, but nothing in
the string widget calls it by default.
