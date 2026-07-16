# Dialog

Status: used

Base UI's Dialog (`@base-ui/react/dialog`) is an unstyled modal dialog: `Dialog.Root`,
`Dialog.Trigger`, `Dialog.Portal`, `Dialog.Backdrop`, `Dialog.Viewport`, `Dialog.Popup`,
`Dialog.Title`, `Dialog.Description`, and `Dialog.Close`. It provides focus trapping, Escape and
outside-click dismissal, body scroll lock, aria-labelledby/-describedby wiring, and
`data-starting-style` / `data-ending-style` transition hooks. Like Menu, it is adopted once per UI
layer, three wrappers total. (The sibling AlertDialog primitive, `src/ui/AlertDialog.tsx:2`, is
covered by `docs/base-ui/alert-dialog.md`.)

## Where it is used

1. `src/ui/Dialog.tsx:2`: shadcn-flavored wrapper for the richtext editor design system. `Dialog`
   wraps Root (lines 11-31), `DialogTrigger` / `DialogClose` support an `asChild` pattern mapped
   onto Base UI's `render` prop (lines 39-67), and `DialogContent` composes Portal + Backdrop +
   Popup with a built-in close button, portalled into `#nc-root` when present (lines 119-151).
   `DialogTitle` and `DialogDescription` re-export the accessible title/description parts (lines
   199-227). Consumers: the editor's imperative modal hook
   (`src/ui/editor/editor-hooks/useModal.tsx:3,27-34`, used by the link, table, layout, and picker
   plugins), `src/ui/editor/plugins/actions/TreeViewPlugin.tsx:7`, `ClearEditorPlugin.tsx`, and
   `ImportExportPlugin.tsx`.
2. `src/core/components/UI/Modal.tsx:4`: the classic app's `Modal`, migrated from react-modal. Uses
   Root + Portal + Backdrop + Viewport + Popup (lines 71-87) with the fade driven by
   `data-starting-style` / `data-ending-style` (lines 21-34), portalled into `#nc-root`. Its main
   consumer is the media library (`src/core/components/MediaLibrary/MediaLibraryModal.tsx:7,29`,
   styled via `StyledModal`).
3. `src/laika-app/ui/LaikaDialog.tsx:3`: the Laika shell's dialog with Header/Body/Footer
   composition (statics at lines 157-160), `Dialog.Title` for the accessible heading (line 136) and
   an `ariaLabel` escape hatch for heading-less dialogs (lines 60-64, 131). Consumer: the command
   palette (`src/laika-app/LaikaCommandPalette.tsx:11,285`).

## Remaining non-Base UI confirmations

A few flows still call `window.confirm` instead of any dialog component:
`src/core/components/Workflow/WorkflowList.tsx:176,185`,
`src/core/components/MediaLibrary/MediaLibrary.tsx:262`,
`src/core/components/Editor/EditorControlPane/EditorControlPane.tsx:175`, and
`src/core/hooks/useNavigationBlocker.ts:66`. The navigation blocker genuinely needs a synchronous
answer during the routing callback, so `window.confirm` is the correct tool there. The other three
could move to a promise-based confirm built like `showAlert` (`src/ui/AlertDialog.tsx:178-185`), but
that is an AlertDialog concern (confirmations are alert dialogs, not plain dialogs) and a behavioral
change to publish/delete flows, so it is left to the alert-dialog track rather than bundled here.

## Motivation

Fully adopted for every styled modal in the codebase; the three wrappers mirror the layering
(`src/ui`, `core`, `laika-app`) the ESLint `local/layer-deps` rule enforces, and each one leans on
Base UI for the hard parts (focus trap, scroll lock, dismissal, labelling) while owning only
visuals.
