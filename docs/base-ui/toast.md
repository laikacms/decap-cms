# Toast

Status: used

Base UI's Toast (`@base-ui/react/toast`) is an unstyled notification system: a `Toast.Provider`
holding a toast list (with `timeout` and `limit`), a `useToastManager()` hook exposing
`toasts`/`add`/`close`, `createToastManager()` for raising toasts outside React (the provider
accepts the manager via its `toastManager` prop), and render parts
`Portal`/`Viewport`/`Root`/`Title`/`Description`/`Close`/`Action`. It handles focus management,
screen-reader announcements (per-toast `priority`), swipe/animation states via
`data-starting-style`/`data-ending-style`, and stacking limits via `data-limited`.

## Where it is used

It replaced `react-toastify` across both shells:

- `src/ui/toastManager.ts:16`: a shared `Toast.createToastManager()` singleton. The ui layer cannot
  import from core (`local/layer-deps`), so ui-level code raises toasts imperatively through this
  manager; core's provider mounts the same instance so both sources render in one viewport. The
  `addToast` helper (`src/ui/toastManager.ts:22-28`) standardizes the type field and announcement
  priority (errors are `high`). Consumer: the richtext editor's share action,
  `src/ui/editor/plugins/actions/ShareContentPlugin.tsx:14,46-47`.
- `src/core/components/UI/Notifications.tsx`: the classic shell surface.
  `Toast.Provider timeout={5000} limit={50} toastManager={toastManager}` (`Notifications.tsx:190`)
  wraps a `NotificationsBridge` (`Notifications.tsx:122-186`) that mirrors the Redux notifications
  slice into toasts via `Toast.useToastManager()`: new store entries call `add` (with translated
  titles, per-notification `dismissAfter`, and an `onClose` that dispatches `dismissNotification`
  back, guarded against loops, `Notifications.tsx:145-153`), and store removals call `close`.
  Rendering keeps react-toastify's old top-right placement and colored theme; exit animations use
  `[data-starting-style]`/`[data-ending-style]`.
- `src/laika-app/LaikaNotifications.tsx`: the Laika shell's equivalent bridge
  (`LaikaNotifications.tsx:132-197`, provider at `:199-205` with a 4500ms timeout), bottom-right
  placement and theme-aware styling that switches surfaces with `useLaikaTheme()`
  (`LaikaNotifications.tsx:61-103`). It uses its own provider-scoped state rather than the shared
  manager since laika renders its own viewport.

Covered by `src/core/components/UI/__tests__/Notifications.spec.tsx` and
`src/laika-app/__tests__/LaikaNotifications.spec.tsx`.

## Why no further adoption

All user-facing notifications flow through the Redux notifications slice (`addNotification` in core
actions) into these two bridges, or through `addToast` for ui-layer code; there is no remaining ad
hoc notification rendering. The duplication between the two bridge components is intentional shell
divergence (placement, theming, cadence), already noted in each file's doc comment, and not a Base
UI adoption gap.
