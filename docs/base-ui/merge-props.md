# mergeProps

Status: rejected

Base UI's `mergeProps` (`@base-ui/react/merge-props`) merges up to five React prop objects with
special-case semantics: event handlers are chained and run right-to-left (a later handler can call
`event.preventBaseUIHandler()` to suppress earlier ones), `className` strings are concatenated,
`style` objects are shallow-merged with rightmost keys winning, and everything else behaves like
`Object.assign` (refs are not merged). Companions include `mergePropsN` (array form) and
`mergeClassNames`. Its intended home is inside callback-form `render` props and `useRender`-based
components, where library-provided props must be combined with your own without clobbering handlers.

## Findings

The repo has no code where these semantics are needed:

- No callback-form render props exist. A repo-wide search for `render={(` in `src/` (excluding
  tests) returns nothing. Every Base UI `render` usage is the element form, e.g.
  `src/ui/Select.tsx:105-113` (`SelectPrimitive.Icon render={<ChevronDownIcon />}`),
  `src/ui/Dialog.tsx:42,59` (forwarding `children` as the render element),
  `src/laika-app/LaikaTooltip.tsx:45`, and the editor toolbar plugins under
  `src/ui/editor/plugins/`. In the element form Base UI merges its internal props with the element's
  props itself, so `mergeProps` never enters the picture.
- The closest hand-rolled equivalent is `cx()` in `src/ui/styled.ts:50-53`, a three-line
  falsy-filtering `className` join used by widgets and the editor
  (`src/ui/editor/editor-ui/ContentEditable.tsx:46`, `src/widgets/object/ObjectControl.tsx:225`,
  etc.). It has none of the handler/style concerns `mergeProps` exists for, and swapping it would
  couple plain class-string joining to a Base UI import for zero gain.
- Style composition is done with Emotion's `css` prop and style arrays (for example
  `src/ui/Select.tsx:156-161`), which Emotion already merges correctly; object-`style` merging is
  not a pattern here.
- Wrappers around Base UI parts (`src/ui/Select.tsx`, `src/ui/DropdownMenu.tsx`,
  `src/ui/Dialog.tsx`, `src/laika-app/ui/`) pass caller props straight through with spreads; they
  set disjoint props (`data-slot`, `css`) rather than competing ones, so there is no
  handler-clobbering bug for `mergeProps` to fix.

## Motivation

`mergeProps` solves a problem this codebase does not currently have. Introducing it now would mean
rewriting working spread-based wrappers to a different idiom, and its handler semantics
(`preventBaseUIHandler`, right-to-left execution) differ from the plain `event.defaultPrevented`
conventions used in local primitives, so a blanket migration could subtly change behavior.

## When to reach for it

The moment a wrapper adopts a callback-form `render` prop (receiving Base UI's props and returning
custom JSX) or a component is built on `useRender` (see `use-render.md`), use `mergeProps` there to
combine the incoming props with local `className`/handlers instead of hand-spreading, exactly as the
Base UI docs prescribe.
