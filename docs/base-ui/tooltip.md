# Tooltip

Status: adopted

Base UI's Tooltip (`@base-ui/react/tooltip`) is an unstyled hover/focus label: `Tooltip.Provider`
(shared delay/timeout config), `Tooltip.Root`, `Tooltip.Trigger` (accepts `delay` and a `render`
prop to delegate to an existing element), `Tooltip.Portal`, `Tooltip.Positioner`, `Tooltip.Popup`,
and `Tooltip.Arrow`. Unlike CSS-only tooltips it opens on keyboard focus as well as hover, closes on
Escape, and wires the accessible description automatically. It was already used in two layers; this
change extends adoption by replacing the last hand-rolled tooltip in the codebase.

## Where it was already used

1. `src/ui/Tooltip.tsx:2`: design-system wrapper (`TooltipProvider` with default `delay={0}`, lines
   7-12; `Tooltip` / `TooltipTrigger`, lines 14-24; `TooltipContent` composing Portal + Positioner +
   Popup + Arrow, lines 61-84). The richtext editor mounts a `TooltipProvider` around its whole UI
   (`src/ui/editor/Editor.tsx:118,309`) and the action plugins consume the parts for their icon
   buttons: `src/ui/editor/plugins/actions/EditModeTogglePlugin.tsx:6`, `SpeechToTextPlugin.tsx:16`,
   `ClearEditorPlugin.tsx:16`, `ImportExportPlugin.tsx:6`, and `ShareContentPlugin.tsx:12`.
2. `src/laika-app/ui/LaikaTooltip.tsx:2`: the Laika wrapper. Single-child API where
   `Tooltip.Trigger delay={0} render={children}` delegates the trigger role to the wrapped element
   (line 45), so icon buttons stay the interactive element. Consumer: the editor view controls
   (`src/laika-app/LaikaEditorViewControls.tsx:7,60-93`, i18n / preview / scroll-sync toggles).

## Adopted in this change: EditorToolbar status-info tooltip

`src/core/components/Editor/EditorToolbar.tsx` contained the one remaining hand-rolled tooltip: a
CSS-only construct (`TooltipText` / `Tooltip` / `TooltipContainer` styled divs) that showed the
open-authoring status explanation by toggling visibility with an `&:hover + ...` sibling selector.
It was mouse-only (no keyboard focus path, no `Escape`), used a fixed `width: 321px` with
`margin-left: -320px` positioning, and put a bare `div` around the icon rather than a focusable
element.

It now wraps `@base-ui/react/tooltip` directly (import at
`src/core/components/Editor/EditorToolbar.tsx:4`), following the precedent of
`src/core/components/UI/Modal.tsx` wrapping the Dialog primitive inside `core`:

- `StatusInfoTrigger` is a styled `Tooltip.Trigger` (a reset button, so the info icon is now
  keyboard reachable) with `delay={0}` and an `aria-label` carrying the status message for icon-only
  accessibility.
- `StatusInfoPositioner` / `StatusInfoBubble` style `Tooltip.Positioner` and `Tooltip.Popup` with
  the same visual language as before (dark #555 bubble, radius 6px), positioned
  `side="bottom" align="end"` to match the old below-and-left placement, above the toolbar via
  `zIndex.zIndex300`.
- `renderStatusInfoTooltip()` composes `Tooltip.Root` and only renders the portal when a message
  exists for the current status (DRAFT / PENDING_REVIEW), preserving the old behavior of a plain
  icon for other statuses. The call site (`{useOpenAuthoring && renderStatusInfoTooltip()}`) is
  unchanged.

The `@/ui` `TooltipContent` was deliberately not reused here: it is styled against the editor token
variables (`--foreground`, `--background`) that are only injected when a richtext widget mounts
`EditorGlobalStyles` (`src/widgets/richtext/widget/control.tsx:123`), whereas the workflow toolbar
renders on entries with no richtext field too. Wrapping the primitive with classic-app tokens avoids
that dependency.

Verification: `pnpm typecheck` passes;
`pnpm vitest run
src/core/components/Editor/__tests__/EditorToolbar.spec.tsx` passes (12/12); ESLint
clean on the changed file.

## Remaining non-adoptions (intentional)

Native `title` attributes on small buttons (e.g. the theme toggle at
`src/laika-app/LaikaHeader.tsx:375`) are left alone: they already pair with `aria-label`s and
converting every `title` to a component tooltip is visual polish, not a correctness fix, and belongs
to the Laika design pass, not this evaluation.
