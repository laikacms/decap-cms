# Alert Dialog

Status: used

Base UI's Alert Dialog (`@base-ui/react/alert-dialog`) is a modal dialog that requires a user
response before proceeding: unlike the plain Dialog it has no built-in dismiss affordance and is
meant for interruptions like "you can't do that" or destructive confirmations.

## Where it lives in this repo

The single wrapper is `src/ui/AlertDialog.tsx`. It has two layers:

1. Styled part wrappers (shadcn-style naming) over the Base UI anatomy:
   - `AlertDialog` -> `AlertDialogPrimitive.Root` (src/ui/AlertDialog.tsx:8)
   - `AlertDialogTrigger` -> `Trigger` (line 14)
   - `AlertDialogContent` -> `Portal` + `Backdrop` + `Popup` in one component (line 48), so call
     sites never touch the portal or backdrop directly
   - `AlertDialogHeader` / `AlertDialogFooter`: plain styled `div`s (lines 74, 91)
   - `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogClose` -> the matching primitives
2. An imperative alert service on top: `showAlert(message, options)` plus `AlertDialogHost` (lines
   183 and 198). `showAlert` is a promise-returning replacement for `window.alert` that works from
   non-React code. It pushes onto a module-level queue observed via `useSyncExternalStore`; the host
   renders one dialog at a time and resolves the promise on dismiss. If no host is mounted it falls
   back to `window.alert` so messages are never dropped.

## Styling and props

- Styled with Emotion `css` template literals (the file uses
  ``), themed via CSS variables (`--popover`,
  `--popover-foreground`, `--muted-foreground`).
- Each wrapper is typed as `React.ComponentProps<typeof AlertDialogPrimitive.X>`, widened with the
  local `WithClassName` helper so Emotion's generated class merges with a caller-supplied one.
- Every part sets a `data-slot="alert-dialog-*"` attribute for targeting in tests and overrides.
- The host relies on the controlled API: `open` plus `onOpenChange(open => ...)` on `Root`, and
  `AlertDialogPrimitive.Close` for the OK button (styled via `buttonVariants` from `src/ui/Button`).
- Not used from the Base UI surface: `Trigger`-driven uncontrolled flow in real call sites (only the
  controlled host renders dialogs today), nested dialogs, and the animation data attributes
  (`data-starting-style` / `data-ending-style`); the backdrop and popup are unanimated.

## Call sites

The declarative parts are exported but production code goes through the service:

- `src/core/components/App/DecapCmsProvider.tsx:167` mounts `<AlertDialogHost />` once near the app
  root, inside the Redux provider, so both the classic and Laika shells get it.
- `showAlert` call sites: `src/core/hooks/useEditor.ts` (publish and status guard messages),
  `src/core/components/Workflow/WorkflowList.tsx:183`,
  `src/core/components/MediaLibrary/MediaLibrary.tsx:239` (file size limit),
  `src/ui/editor/plugins/ContextMenuPlugin.tsx` (clipboard permission denials),
  `src/backends/github/API.tsx` and `src/backends/azure/AuthenticationPage.tsx` (backend errors, the
  classic non-React callers the service was built for).
- Behavior is covered by `src/ui/__tests__/AlertDialog.spec.tsx` (queueing, custom title and OK
  label, `window.alert` fallback when no host is mounted).

## Follow-up opportunity

`window.confirm` is still used in about a dozen places (`src/core/hooks/useEditor.ts:224` and
onward, `src/core/components/MediaLibrary/MediaLibrary.tsx:262`,
`src/core/components/Editor/EditorControlPane/EditorControlPane.tsx:175`,
`src/core/hooks/useNavigationBlocker.ts`, `src/core/actions/mediaLibrary.tsx`). A
`showConfirm(): Promise<boolean>` built on the same host and queue would replace those native
blocking prompts with themed, accessible dialogs and would reuse the two-button Cancel / Confirm
layout the Base UI docs show as the canonical alert dialog use case.
