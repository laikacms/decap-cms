# `src/app/` - the default, opinionated CMS app

`src/app/` is the batteries-included Decap CMS application: a composition root that wires `core`
(the headless engine) to a concrete UI shell, registers every built-in backend, widget, entry codec,
format pack, and locale, and mounts itself into the DOM.

It is the **default export of the package**. `@laikacms/decap-cms` (the `.` subpath) resolves to
`src/app/index.ts`, so anyone who does not want to build their own app gets this one:

```html
<!-- The CDN build (`unpkg`/`jsdelivr` fields -> dist/cdn/decap-cms.js) bundles this entry. -->
<script src="https://cdn.jsdelivr.net/npm/@laikacms/decap-cms@4/dist/cdn/decap-cms.js"></script>
```

```ts
// Same thing, bundled: importing the package for its side effect boots the CMS.
import '@laikacms/decap-cms';
```

Everything else in the package (`core`, `ui`, `widgets`, `backends`, `entry-codecs`, `format-packs`)
is a library you compose yourself. `src/app/` is the one place that makes choices on your behalf.

## Entry points

| Import                            | What you get                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `@laikacms/decap-cms` / `.../app` | [`index.ts`](./index.ts): `registerExtensions()` + auto-`init()` + `window.CMS` globals |
| `@laikacms/decap-cms/app/bare`    | [`bare.ts`](./bare.ts): the same public API, no registrations, no auto-mount            |

`/app` is `/app/bare` plus two side effects: it calls `registerExtensions()` (see
[`extensions.ts`](./extensions.ts)) and, in a browser, calls `init()` unless
`window.CMS_MANUAL_INIT` is set. Reach for `/app/bare` when you know your subset (say GitHub +
JSON + five widgets) and want the bundler to tree-shake the other ~10 backends and ~17 widgets;
register what you need via `CMS.registerBackend()` / `registerWidget()` / `registerEntryCodec()`,
then call `init()`.

`src/laika-app/` is the sibling v4.beta "Laika" shell with the same `index.ts` / `bare.ts` split.
The two shells are peers: they must not import each other's components.

## What lives here

- [`index.ts`](./index.ts): the fat entry. Eager registration, auto-init, `window.CMS` / `initCMS` /
  `h` globals, re-exports of everything in `bare.ts`.
- [`bare.ts`](./bare.ts): `init()`, the React-root cache (`init()` is idempotent, so HMR and dynamic
  config swaps are safe), and the public API surface.
- [`extensions.ts`](./extensions.ts): the single `registerExtensions()` call listing every built-in.
  Idempotent via lodash `once`. **No other module in this package registers anything at import
  time.**
- [`components/`](./components): the app shell. `App` (routed layout), `AppContent` (render-prop
  layout surface), `Header`, plus re-exports of the `CmsSlots` extension points. Side-effect free.
- [`locales.ts`](./locales.ts), [`global.d.ts`](./global.d.ts): locale barrel and the `window`
  augmentation for the globals above.

## Colors and theming

**Colors belong here.** The palette, the semantic color tokens, and any other opinionated visual
default are part of the app's opinion, not of the layers below it. `src/ui/` primitives and
`src/widgets/` / `src/core/` components read tokens; they must not define color values.

Today the token definitions still physically live in
[`src/ui/default/styles.tsx`](../ui/default/styles.tsx): `colorsRawDefaults` (the raw palette),
`colorsDefaults` (semantic tokens), and the `toCssVarTokens` layer that resolves every token to
`var(--decap-color-*, <default>)`. That is tracked debt, not the target shape. The defaults belong
in `src/app/` so that a consumer building on `/app/bare` supplies its own palette instead of
inheriting ours. Until that move happens, do not add new hardcoded colors to the lower layers.

The consumer-facing contract is stable either way. Pass a `DecapTheme` to `DecapCmsProvider`:

```tsx
<DecapCmsProvider theme={{ colors: { active: '#e91e63' }, colorsRaw: { blue: '#00aaff' } }} />;
```

or emit the CSS variables yourself:

```ts
import { themeToCssVars } from '@laikacms/decap-cms/core';

for (const [name, value] of Object.entries(themeToCssVars({ colors: { active: '#e91e63' } }))) {
  document.documentElement.style.setProperty(name, value);
}
```

`DefaultTokensGlobalStyle` emits every default onto `:root` so tokens are readable on first paint;
theme overrides land on top through normal cascade order. Note that the rich-text editor and
`src/ui/*` theme off a separate `--background` / `--foreground` system toggled by the `.dark` class,
not off `--decap-color-*`.

## Conventions

- This folder and `src/laika-app/` are the **only** modules allowed to run registrations at load.
  Keep side effects in `index.ts` / `extensions.ts`; `bare.ts` and `components/` stay pure.
- The app shell may compose `core/components` pages (the one sanctioned cross-layer edge, see
  [`src/ui/README.md`](../ui/README.md#component-layering)). It must not import from
  `src/laika-app/`.
- New built-ins get registered in `extensions.ts` and nowhere else, so `/app/bare` consumers keep a
  complete, greppable list of what the fat entry costs them.
