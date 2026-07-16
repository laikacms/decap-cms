# Avatar

Status: used

Base UI's `Avatar` (`@base-ui/react/avatar`) is a small unstyled primitive with three parts:
`Avatar.Root` (a `<span>` container), `Avatar.Image` (an `<img>` whose loading status is tracked
internally), and `Avatar.Fallback` (rendered while the image is loading, on load error, or when no
image is provided). The repo has exactly one direct import of it.

## Where it is used

- `src/laika-app/ui/LaikaAvatar.tsx`: the only wrapper, part of the new Laika UI shell's local
  primitive set (`src/laika-app/ui/`).
- Exported from `src/laika-app/ui/index.ts:28-29` and re-exported through the public `bare` entry at
  `src/laika-app/bare.ts:131,150-151` (`LaikaAvatar`, `LaikaAvatarProps`, `LaikaAvatarSize`), so it
  is part of the package's laika-app API surface.
- Covered by a Storybook story (`src/laika-app/ui/LaikaAvatar.stories.tsx`) and a spec
  (`src/laika-app/ui/__tests__/LaikaAvatar.spec.tsx`) that exercises initials fallback, the `?`
  default when no name is given, image rendering, and the error-fallback path.

## How the wrapper is implemented

`LaikaAvatar` (`src/laika-app/ui/LaikaAvatar.tsx:64-73`) composes all three parts:

- `Avatar.Root` is styled with Emotion via
  `styled(Avatar.Root, { shouldForwardProp:
  laikaShouldForwardProp })` (line 25), using a transient
  `$size` prop mapped through a `sizeMap` of three sizes: `sm` 24px, `md` 36px, `lg` 56px. Styling
  is a circle (`border-radius: 50%`, `overflow: hidden`) tinted with `colors.activeBackground` /
  `colors.active` from `@/ui/default`.
- `Avatar.Image` is styled to fill the circle with `object-fit: cover` (line 43) and is only
  rendered when `src` is provided.
- `Avatar.Fallback` (line 70) always renders the first uppercase letter of `name`, or `?` when the
  name is missing or blank, with an `aria-label` derived from `alt ?? name`.

The wrapper relies on Base UI's image-loading-status tracking to swap between image and fallback
automatically; it does not use the `delay` prop, `onLoadingStatusChange`, or the `render` prop.
Props are `size`, `src`, `name`, `alt` plus passthrough span attributes (`LaikaAvatarProps`, line
50).

## Adoption gap: the legacy hand-rolled avatar

The avatar the app actually renders today is still hand-rolled.
`src/core/components/UI/
SettingsDropdown.tsx:26-62` defines a local `Avatar` that renders a plain
`styled.img` when `imageUrl` is set, or an `Icon type="user"` placeholder otherwise, with no
handling of image load errors (a broken `avatar_url` shows a broken image). That component is used
by all four shells:

- `src/app/components/Header.tsx:291`
- `src/core/components/Editor/EditorToolbar.tsx:716`
- `src/laika-app/LaikaHeader.tsx:382`
- `src/laika-app/LaikaEditorToolbar.tsx:405`

So `LaikaAvatar` currently has no in-app JSX call sites; it ships as an exported primitive (plus
stories and tests). A natural follow-up is to replace the local `Avatar` inside `SettingsDropdown`
with the Base UI-backed pattern (or `LaikaAvatar` itself, respecting the `local/layer-deps` layering
since `SettingsDropdown` lives in `core`), which would add proper error fallback and delete the
bespoke image/placeholder switching.
