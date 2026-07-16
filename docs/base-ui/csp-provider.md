# CSP Provider

Status: rejected

Base UI's `CSPProvider` (`@base-ui/react/csp-provider`) exists for apps running under a strict
Content Security Policy. It takes a `nonce` string that Base UI applies to the inline `<style>` and
`<script>` tags it renders, plus a `disableStyleElements` boolean (default false) that suppresses
those inline `<style>` elements entirely in favor of external CSS. The inline styles come from a
small set of parts, notably `ScrollArea.Viewport` and `Select.Popup` when `alignItemWithTrigger` is
enabled, which inject a style tag to hide native scrollbars. Under a strict `style-src` policy
without a matching nonce, those tags are blocked.

## Exposure in this repo

- `src/ui/Select.tsx:193-228`: `SelectContent` renders `SelectPrimitive.Positioner` and passes
  `alignItemWithTrigger` through (Base UI defaults it to true), so Base UI does emit an inline
  scrollbar-hiding `<style>` for open selects. This is the one real touchpoint.
- `src/ui/ScrollArea.tsx:32-47`: the local `ScrollArea` is a plain styled `div`, not Base UI's
  ScrollArea, so the `ScrollArea.Viewport` inline-style case does not apply.

## Why rejected

There is no CSP support story in this project for `CSPProvider` to slot into:

- `SECURITY.md` documents versions, reporting and practices, but says nothing about CSP, nonces, or
  inline-style constraints; no doc in the repo instructs integrators to run the CMS under a strict
  CSP.
- The entire UI is styled at runtime with Emotion (`@emotion/react` / `@emotion/styled` throughout
  `src/ui` and both shells). Under a strict `style-src` the app is already non-functional unless the
  integrator allows `'unsafe-inline'` or supplies a nonce to an Emotion cache, and the repo has no
  plumbing for that: there is no `CacheProvider` or Emotion `nonce` option anywhere in `src/` (the
  only `nonce` hits are OAuth state nonces in `src/lib/auth/pkce-oauth.ts` and
  `src/lib/auth/implicit-oauth.ts`, unrelated to CSP).
- `DecapCmsProvider` (`src/core/components/App/DecapCmsProvider.tsx`) has no public prop through
  which an integrator could pass a per-request nonce, and as a mostly hash-routed SPA loaded from a
  static admin page there is usually no server generating one.

Wrapping the tree in `CSPProvider` today would therefore add a context provider that changes
nothing: pages that allow Emotion's inline styles also allow Base UI's, and pages that do not are
broken far beyond Base UI's two style tags.

## When to revisit

If CSP hardening becomes a goal (an integrator request or a documented strict-CSP deployment mode),
do it as one coherent change: add a `nonce` option to `DecapCmsProvider`, feed it to an Emotion
`CacheProvider` and to Base UI's `CSPProvider` in the same place, and document the required
`style-src` policy. Adopting `CSPProvider` alone, without the Emotion half, would give a false sense
of CSP compatibility.
