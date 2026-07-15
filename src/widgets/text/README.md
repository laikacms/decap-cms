# Text widget

The text widget renders a multi-line, auto-resizing `<textarea>` (via
`react-textarea-autosize`) for a long-form string value. It shares its
config shape with the `string` widget, which renders a single-line
`<input type="text">` instead.

## Config

```yaml
- { label: 'Body', name: 'body', widget: 'text' }
```

- `default` (optional) — pre-filled value for new entries.
- `pattern` (optional) — `[regex, message]`; the field fails validation when
  the value doesn't match `regex`, and `message` is shown as the error.
- `required` (optional, default `true`) — whether the field must be filled
  in before the entry can be saved.
- `hint` (optional) — helper text rendered alongside the field label.

## Forced re-measure on width change

Source: `TextControl.tsx`.

`react-textarea-autosize` only recalculates the textarea's height on render
and on window resize. If the field mounts before its containing pane has
its final width — for example while the pane is hidden, collapsed, or still
mid-layout — the text wraps into a too-narrow column and the computed
height stays far too large until something else triggers a re-render.

To work around this, `TextControl` attaches a `ResizeObserver` to the
textarea and forces one extra re-render (via a `useReducer` counter) only
when the textarea's actual rendered width changes. This re-render doesn't
change any props or the value — it exists purely to give
`react-textarea-autosize` a chance to re-measure and recompute the correct
height once the real layout width is known. `ResizeObserver` is skipped in
environments where it's unavailable, in which case the textarea falls back
to `react-textarea-autosize`'s normal render/resize-only measurement.

## Bidi Trojan-Source warning

Source: `bidiControls.containsBidiControls` (`src/lib/widgets/bidiControls.ts`).

If the field's raw string value contains a Unicode bidirectional
control character (`U+061C`, `U+202A`–`U+202E`, or `U+2066`–`U+2069`), the
widget renders a `⚠` warning span (`role="alert"`) next to the textarea,
with a tooltip explaining the risk.

These control characters can reorder how surrounding text is *displayed*
without changing the underlying code points — the technique behind
"Trojan Source" spoofing (CVE-2021-42574). A value like
`admin<RLO>txt.exe` (where `<RLO>` is `U+202E RIGHT-TO-LEFT OVERRIDE`) can
render as `admin exe.txt`, making malicious content look legitimate at a
glance, including in longer body text where the reordering is easy to miss.

The widget only **warns** — it never strips or mutates the value. The raw
value, bidi control characters included, is written to disk exactly as
entered. Editors should review the raw value carefully before saving when
this warning appears. A `stripBidiControls` helper exists in
`bidiControls.ts` for opt-in, collection-level sanitization, but nothing in
the text widget calls it by default.
