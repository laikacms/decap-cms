import { css } from '@emotion/react';

/**
 * Minimal hand-authored equivalents of the Tailwind utility classes still
 * referenced as literal `className` strings across `src/ui/editor/`
 * (`Editor.tsx` and its `plugins/**` — the toolbar, floating link/format
 * menus, drag handle, table/code-block menus, mentions/emoji pickers, …).
 *
 * This tree predates the Tailwind → Emotion migration documented in
 * `editor-theme.ts` / `global-styles.tsx`: those two files were ported, but
 * the Tailwind utility-class strings in the surrounding components were
 * left in place on the (incorrect) assumption that a Tailwind build step
 * still existed. It doesn't — this repo is Emotion-only (see
 * `src/ui/README.md`) and never had a `tailwind.config.*` or `@tailwindcss/*`
 * dependency, so those class names compiled to nothing and every one of
 * these layouts silently collapsed to `display: block` (DCMS-582).
 *
 * Rather than hand-porting ~25 files' worth of JSX to `css`/`variants`,
 * this backs the exact set of utility tokens still in use with real CSS,
 * scoped to this global stylesheet (mounted once per editor instance via
 * `EditorGlobalStyles`). Values reuse the design tokens already defined in
 * `globalStyles` (`--background`, `--border`, `--ring`, …) so they match
 * Tailwind's config that presumably generated them originally.
 */
export const utilityStyles = css`
  /* Display */
  .flex {
    display: flex;
  }
  .grid {
    display: grid;
  }
  .flex-col {
    flex-direction: column;
  }
  .flex-1 {
    flex: 1 1 0%;
  }
  .flex-grow {
    flex-grow: 1;
  }
  .shrink-0 {
    flex-shrink: 0;
  }

  /* Flex/grid alignment */
  .items-center {
    align-items: center;
  }
  .justify-start {
    justify-content: flex-start;
  }
  .justify-end {
    justify-content: flex-end;
  }
  .justify-between {
    justify-content: space-between;
  }

  /* Position */
  .relative {
    position: relative;
  }
  .absolute {
    position: absolute;
  }
  .sticky {
    position: sticky;
  }
  .top-0 {
    top: 0;
  }
  .left-0 {
    left: 0;
  }

  /* z-index */
  .z-10 {
    z-index: 10;
  }
  .z-50 {
    z-index: 50;
  }
  .\!z-50 {
    z-index: 50 !important;
  }
  .\[\&\:has\(\*\)\]\:\!z-10:has(*) {
    z-index: 10 !important;
  }

  /* Sizing */
  .w-4 {
    width: 1rem;
  }
  .w-12 {
    width: 3rem;
  }
  .w-40 {
    width: 10rem;
  }
  .w-56 {
    width: 14rem;
  }
  .w-full {
    width: 100%;
  }
  .w-min {
    width: min-content;
  }
  .min-w-36 {
    min-width: 9rem;
  }
  .min-w-48 {
    min-width: 12rem;
  }
  .max-w-sm {
    max-width: 24rem;
  }
  .h-4 {
    height: 1rem;
  }
  .h-7\! {
    height: 1.75rem !important;
  }
  .h-8 {
    height: 2rem;
  }
  .h-96 {
    height: 24rem;
  }
  .h-min {
    height: min-content;
  }
  .h-0\.5 {
    height: 0.125rem;
  }
  .h-\[calc\(100vh-141px\)\] {
    height: calc(100vh - 141px);
  }
  .size-3 {
    width: 0.75rem;
    height: 0.75rem;
  }
  .size-4 {
    width: 1rem;
    height: 1rem;
  }

  /* Spacing */
  .gap-1 {
    gap: 0.25rem;
  }
  .gap-2 {
    gap: 0.5rem;
  }
  .p-0 {
    padding: 0;
  }
  .p-1 {
    padding: 0.25rem;
  }
  .p-2 {
    padding: 0.5rem;
  }
  .pl-2 {
    padding-left: 0.5rem;
  }
  .pl-4 {
    padding-left: 1rem;
  }
  .pl-14 {
    padding-left: 3.5rem;
  }
  .px-2 {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .py-1\.5 {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
  }
  .space-x-2 > :not([hidden]) ~ :not([hidden]) {
    margin-left: 0.5rem;
  }
  .space-y-4 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1rem;
  }

  /* Borders / radius */
  .border {
    border: 1px solid var(--border);
  }
  .border-t {
    border-top: 1px solid var(--border);
  }
  .border-b {
    border-bottom: 1px solid var(--border);
  }
  .rounded-sm {
    border-radius: 0.125rem;
  }
  .rounded-md {
    border-radius: 0.375rem;
  }
  .rounded-lg {
    border-radius: 0.5rem;
  }
  .ring-1 {
    box-shadow: 0 0 0 1px var(--tw-ring-color, var(--ring));
  }
  .ring-foreground\/10 {
    --tw-ring-color: color-mix(in srgb, var(--foreground), transparent 90%);
  }

  /* Backgrounds / text colors */
  .bg-background {
    background-color: var(--background);
  }
  .bg-foreground {
    background-color: var(--foreground);
  }
  .bg-popover {
    background-color: var(--popover);
  }
  .bg-primary {
    background-color: var(--primary);
  }
  .bg-accent {
    background-color: var(--accent);
  }
  .bg-transparent {
    background-color: transparent;
  }
  .\!bg-transparent {
    background-color: transparent !important;
  }
  .text-background {
    color: var(--background);
  }
  .text-foreground {
    color: var(--foreground);
  }
  .text-muted-foreground {
    color: var(--muted-foreground);
  }
  .text-popover-foreground {
    color: var(--popover-foreground);
  }
  .text-accent-foreground {
    color: var(--accent-foreground);
  }
  .text-gray-500 {
    color: #6b7280;
  }
  .hover\:bg-accent:hover {
    background-color: var(--accent);
  }
  .hover\:text-accent-foreground:hover {
    color: var(--accent-foreground);
  }
  .hover\:text-foreground:hover {
    color: var(--foreground);
  }
  .focus\:bg-accent:focus {
    background-color: var(--accent);
  }
  .focus\:text-accent-foreground:focus {
    color: var(--accent-foreground);
  }
  .data-\[disabled\=true\]\:pointer-events-none[data-disabled='true'] {
    pointer-events: none;
  }
  .data-\[disabled\=true\]\:opacity-50[data-disabled='true'] {
    opacity: 0.5;
  }

  /* Typography */
  .text-xs {
    font-size: 0.75rem;
    line-height: 1rem;
  }
  .text-sm {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
  .text-center {
    text-align: center;
  }
  .text-ellipsis {
    text-overflow: ellipsis;
  }
  .whitespace-nowrap {
    white-space: nowrap;
  }
  .font-normal {
    font-weight: 400;
  }

  /* Effects */
  .opacity-0 {
    opacity: 0;
  }
  .opacity-60 {
    opacity: 0.6;
  }
  .shadow {
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }
  .shadow-md {
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  /* Overflow */
  .overflow-auto {
    overflow: auto;
  }
  .overflow-hidden {
    overflow: hidden;
  }

  /* Interactivity */
  .cursor-default {
    cursor: default;
  }
  .cursor-grab {
    cursor: grab;
  }
  .active\:cursor-grabbing:active {
    cursor: grabbing;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .pointer-events-none {
    pointer-events: none;
  }
  .select-none {
    user-select: none;
  }
  .outline-none {
    outline: none;
  }
  .outline-hidden {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }

  /* Transitions */
  .transition-opacity {
    transition-property: opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  .duration-300 {
    transition-duration: 300ms;
  }
  .will-change-transform {
    will-change: transform;
  }

  /* Misc layout used alongside the flex toolbar containers */
  .clear-both {
    clear: both;
  }
  .vertical-align-middle {
    vertical-align: middle;
  }
`;
