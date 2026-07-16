# Separator

Status: rejected

Base UI's Separator (`@base-ui/react/separator`) is a one-element primitive: a `<div>` with the ARIA
`separator` role, an `orientation` prop (`horizontal` default), a matching `data-orientation`
attribute, and the usual `render`/`className`/`style` composition. It has no parts, no state, and no
keyboard behavior; it exists purely so a divider is announced correctly to assistive technology.

## Current state in this repo

There are zero imports of `@base-ui/react/separator`. The local primitive is functionally a
superset:

- `src/ui/Separator.tsx:19-39`: renders a `<div data-orientation=...>` styled via Emotion (1px line,
  orientation-aware). It adds a `decorative` prop, defaulting to `true`, which renders
  `role="none"`; only `decorative={false}` produces `role="separator"` with `aria-orientation`.
  Exported from `src/ui/index.ts:18`.

Call sites, all using the decorative default:

- `src/ui/ButtonGroup.tsx:98` and `src/ui/Field.tsx:206`: visual dividers inside grouped controls
  and field chrome.
- Richtext editor toolbar dividers: `src/ui/editor/Editor.tsx:315-357` (seven vertical dividers
  between toolbar sections), `src/ui/editor/plugins/FloatingTextFormatPlugin.tsx:240,259`,
  `src/ui/editor/plugins/toolbar/ElementFormatToolbarPlugin.tsx:128`.

Unrelated namesakes: `src/laika-app/LaikaCollectionTop.tsx:92` and
`src/laika-app/LaikaEditorToolbar.tsx:276` define their own local styled `Separator` that renders a
`/` breadcrumb glyph; those are not dividers in this sense.

## Why not adopt

The Base UI version is the same single `<div>` this repo already ships, minus the `decorative`
escape hatch. Every current call site is a purely visual divider between controls, where
`role="none"` (the local default) is the more correct semantics; swapping to Base UI would either
announce meaningless separators to screen readers or force wrapping to re-add decorative handling.
There is no behavior, keyboard interaction, or state to gain, so the swap would be a dependency
substitution with a small semantics regression.

If the editor toolbar is ever migrated to Base UI Toolbar (see docs/base-ui/toolbar.md), its
dividers should become `Toolbar.Separator` as part of that work, which supersedes this component
inside toolbars; the general-purpose `@/ui` Separator stays as is.
