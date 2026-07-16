# Drawer

Status: used

Base UI's Drawer (`@base-ui/react/drawer`) is a panel that slides in from the edge of the screen,
with focus trapping, Esc-to-close, scroll locking, and swipe-to-dismiss gestures built in. This repo
uses it in exactly one place: the mobile variant of the Laika sidebar.

## Where it is used

- `src/laika-app/LaikaSidebar.tsx:5` is the only import of `@base-ui/react/drawer` in `src/`.
- There is no `src/ui` wrapper for Drawer. The parts are styled directly in `laika-app` with
  Emotion's `styled(Drawer.Part)`, which is fine for a single call site; if a second drawer appears,
  promoting the styled parts into `src/ui` would be the move.

## How it works

`LaikaSidebar` is responsive at `LAIKA_BREAKPOINT_MOBILE` (via a local `useIsMobileViewport` hook
built on `matchMedia`, `LaikaSidebar.tsx:46`):

- Desktop: a plain static rail (`SidebarShell`, a sticky `<aside>`), no Drawer involved.
- Mobile: the same `navContent` is rendered inside a Base UI Drawer (`LaikaSidebar.tsx:321-357`),
  replacing the previous hand-rolled off-canvas panel.

Parts and props relied on:

- `Drawer.Root` is fully controlled: `open={isMobileSidebarOpen}` and an `onOpenChange` that only
  forwards close events. The open state lives in `LaikaShellContext`
  (`src/laika-app/LaikaShellContext.tsx:39`), so the header hamburger button keeps toggling the
  sidebar without knowing about the Drawer.
- `swipeDirection="left"` enables swipe-to-dismiss toward the left edge, matching the slide-in
  direction of the panel.
- `Drawer.Portal keepMounted` keeps the closed panel in the DOM. The comment at
  `LaikaSidebar.tsx:332` explains why: external tooling (`dev-test/laika-test-runner.html`) inspects
  the panel's `data-mobile-open` attribute, which mirrors the old off-canvas markup.
- `Drawer.Backdrop` (styled as `MobileBackdrop`, `LaikaSidebar.tsx:84`) recreates the old dimmed
  overlay below the top bar. It fades using Base UI's transition style hooks:
  `[data-starting-style]` and `[data-ending-style]` set `opacity: 0`, with a plain CSS
  `transition: opacity 0.2s ease`.
- `Drawer.Viewport` (styled as `MobileViewport`, `LaikaSidebar.tsx:102`) is the fixed positioning
  container (280px wide, below the top bar) and hosts the swipe handling.
- `Drawer.Popup` (styled as `MobilePanel`, `LaikaSidebar.tsx:112`) is the sliding panel. It uses the
  `render={<aside />}` render prop so the panel stays a semantic `<aside>` with an `aria-label`, and
  animates with `translateX(-100%)` under the same starting/ending style hooks.
- The panel's `onClick` closes the drawer whenever a nav link inside is clicked
  (`LaikaSidebar.tsx:342`), since router pushes do not fire `popstate`.

Notably, `Drawer.Trigger`, `Drawer.Close`, `Drawer.Title`, `Drawer.Description`, and
`Drawer.Content` are not used: the trigger is the external hamburger in the Laika header, and the
panel content is the shared nav markup rather than a titled dialog body.

## Styling approach

All styling is Emotion `styled()` over the Drawer parts, keyed off Base UI data attributes rather
than the swipe CSS variables (`--drawer-swipe-progress`, `--drawer-swipe-movement-x`) shown in the
official demo. That means the swipe gesture dismisses correctly but the panel does not visually
track the finger mid-swipe; wiring those variables into `MobilePanel`/`MobileBackdrop` would be a
small polish upgrade.

## Tests

`src/laika-app/__tests__/LaikaSidebar.spec.tsx` stubs `window.matchMedia` to report the mobile
breakpoint as matching, forcing the Drawer code path under jsdom (see the comment at line 137).
