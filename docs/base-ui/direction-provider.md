# Direction Provider

Status: adopted

Base UI's `DirectionProvider` (`@base-ui/react/direction-provider`) enables RTL behavior for Base UI
components. It takes a single `direction` prop (`'ltr' | 'rtl'`, default `'ltr'`) and provides it
via context; components like Menu, Select, Slider and the positioning engine read it to flip
keyboard navigation and popup alignment. Crucially, Base UI never reads the DOM `dir` attribute
itself: without the provider every Base UI part behaves LTR even on a page that sets
`<html dir="rtl">`. A companion `useDirection` hook exposes the current value.

## Why this matters here

- The CMS ships RTL-language locales: `src/locales/he` (Hebrew) and `src/locales/fa` (Farsi),
  selected through the `locale` config option (`src/core/reducers/config.ts:31`, phrases via
  `src/core/lib/phrases.ts:5`).
- Decap CMS is mounted into an admin page the integrator owns. A Hebrew/Farsi site will typically
  set `dir="rtl"` on that page, which flips text alignment and flex layout via CSS, but before this
  change nothing in the repo told Base UI about it: a repo-wide search for `dir=` / `rtl` /
  `DirectionProvider` in `src/app`, `src/laika-app` and `src/core` found zero direction handling. On
  such pages every Base UI popup (Menu, Select, Tooltip, the Laika command palette) would position
  and arrow-key as if the page were LTR.
- Both shells funnel through one provider, so there is a single correct wrap point: the classic app
  mounts `DecapCmsProvider` in `src/app/index.ts:73`, and the Laika shell wraps it via
  `src/laika-app/LaikaThemeContext.tsx:5`.

## What was adopted

- `src/core/lib/textDirection.ts`: new `detectTextDirection(element?)` helper returning
  `'ltr' | 'rtl'`. It resolves, in order: the nearest ancestor `dir` attribute (`closest('[dir]')`,
  the explicit author signal), the computed CSS `direction` (covers stylesheets that set
  `direction: rtl` without an attribute), then defaults to `ltr` (also for `dir="auto"` and non-DOM
  environments).
- `src/core/components/App/DecapCmsProvider.tsx:1,12,157-162,166-179`: the provider now reads the
  host page direction once at mount (`useState(() => detectTextDirection())`) and wraps the whole
  subtree (global styles, `AlertDialogHost`, i18n, routing, children) in
  `<DirectionProvider direction={direction}>`. Reading once is deliberate; page direction is a
  document-level property that does not change during a session.
- Test: `src/core/lib/__tests__/textDirection.spec.ts` (5 cases: default ltr, `dir="rtl"`,
  case-insensitivity, nearest-ancestor resolution, `dir="auto"` fallback). All pass.

Importing `@base-ui/react` from `core` follows existing precedent
(`src/core/components/UI/Modal.tsx`, `src/core/components/UI/Notifications.tsx`).

## What was deliberately not done

Direction is not derived from the `locale` config. The locale only switches translation strings; the
CMS layout is written with physical CSS properties (left/right paddings, absolute positioning) and
renders LTR regardless of locale. Forcing `direction="rtl"` whenever `locale: he` is set would make
Base UI keyboard behavior disagree with the visible LTR layout. The host page `dir` attribute is the
correct signal, and integrators who want a fully mirrored admin UI control it. A full RTL layout
pass (logical CSS properties across `src/ui` and the shells) would be a separate, much larger
effort; this change makes Base UI primitives correct on the pages where integrators have already
opted into RTL.
