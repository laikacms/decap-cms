import { css, Global } from '@emotion/react';

import type { ReactNode } from 'react';

/**
 * shadcn/ui-style design tokens (CSS custom properties): `--popover`,
 * `--foreground`, `--border`, `--primary`, etc. Every Base UI-primitive
 * popup in this folder (`AlertDialog.tsx`, `Dialog.tsx`, `Popover.tsx`,
 * `Combobox.tsx`, `Command.tsx`, `DropdownMenu.tsx`, `Select.tsx`) reads
 * these via `var(--token)`.
 *
 * Declared once here so the values live in exactly one place. Two call
 * sites render this same block:
 *  - `ShadcnTokensGlobalStyle`, mounted unconditionally at the app root by
 *    `DecapCmsProvider` — required so popups triggered outside the
 *    rich-text editor (the "Unsaved changes" confirm, any Base UI select,
 *    etc.) resolve these variables at all (DCMS-1851).
 *  - the app-level global styles, which interpolate
 *    `shadcnTokensCss` into its own `:root`/`.dark` block alongside the
 *    editor-only `--editor-*` tokens, so the editor subtree keeps working
 *    the same way if it's ever mounted without `DecapCmsProvider` (e.g. in
 *    isolation/Storybook).
 */
export const shadcnTokensCss = css`
  :root {
    --background: #ffffff;
    --foreground: #020817;
    --card: #ffffff;
    --card-foreground: #020817;
    --popover: #ffffff;
    --popover-foreground: #020817;
    --primary: #0f172a;
    --primary-foreground: #f8fafc;
    --secondary: #f1f5f9;
    --secondary-foreground: #0f172a;
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    --accent: #f1f5f9;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #f8fafc;
    --border: #e2e8f0;
    --input: #e2e8f0;
    --ring: #0f172a;
    --radius: 0.5rem;
  }

  /*
   * Dark tokens aligned with the app's dark palette so popups match the rest
   * of the shell rather than shadcn near-black defaults. Activated by the
   * .dark class an app shell toggles on the document element.
   */
  .dark {
    --background: #11141a;
    --foreground: #c8ced8;
    --card: #1c1f26;
    --card-foreground: #c8ced8;
    --popover: #1c1f26;
    --popover-foreground: #c8ced8;
    --primary: #f3f4f6;
    --primary-foreground: #11141a;
    --secondary: #1c1f26;
    --secondary-foreground: #f3f4f6;
    --muted: #1c1f26;
    --muted-foreground: #9aa3b2;
    --accent: #1d2a4a;
    --accent-foreground: #f3f4f6;
    --destructive: #ff8a8a;
    --destructive-foreground: #11141a;
    --border: #2a2f3a;
    --input: #2a2f3a;
    --ring: #6ea1ff;
  }
`;

/**
 * Mounts {@link shadcnTokensCss} on `:root`/`.dark`. Render exactly once,
 * unconditionally, near the app root (`DecapCmsProvider` does this) so
 * every Base UI popup resolves its tokens regardless of whether the
 * rich-text editor is mounted anywhere in the tree.
 */
export function ShadcnTokensGlobalStyle(): ReactNode {
  return <Global styles={shadcnTokensCss} />;
}
