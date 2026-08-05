import { css, Global } from '@emotion/react';

import { shadcnTokensCss } from '@/ui/ShadcnTokens';
import { editorThemeStyles } from './editor-theme';
import { utilityStyles } from './utility-styles';

import type { ReactNode } from 'react';

/**
 * Design tokens + editor content styles.
 *
 * The upstream editor relied on Tailwind's design tokens and a `.css` file.
 * Here those are provided as emotion global styles: a set of CSS custom properties
 * (light + `.dark`) and the editor's structural CSS (code blocks, tables,
 * syntax-highlight token colours, collapsible containers).
 *
 * The shadcn-style token set (`--popover`, `--foreground`, `--border`, …)
 * that the Base UI-primitive popups in `src/ui` also consume is declared
 * once in `shadcnTokensCss` (see `@/ui/ShadcnTokens`) and interpolated here
 * rather than redeclared, so this block only adds the editor-only
 * `--editor-*` tokens on top of it (DCMS-1851). `DecapCmsProvider` mounts
 * `shadcnTokensCss` separately at the app root so it's available even when
 * the rich-text editor isn't mounted anywhere in the tree.
 */
const globalStyles = css`
  ${shadcnTokensCss}

  :root {
    /*
     * Editor content colours: link, inline highlight, and the prism
     * syntax-highlight tokens. Kept as variables so the dark block can
     * retune them for contrast on the near-black surface instead of leaving
     * the light hues (which go muddy and low-contrast in dark mode).
     */
    --editor-link: #2563eb;
    --editor-highlight: #fef08a;
    --editor-syntax-comment: slategray;
    --editor-syntax-punctuation: #999999;
    --editor-syntax-property: #990055;
    --editor-syntax-selector: #669900;
    --editor-syntax-operator: #9a6e3a;
    --editor-syntax-attr: #0077aa;
    --editor-syntax-variable: #ee9900;
    --editor-syntax-function: #dd4a68;
    --editor-syntax-keyword: #581c87;
  }

  /*
   * Dark editor-content tokens aligned with the laika dark palette (see
   * laikaThemes.ts). Activated by the dark class that LaikaThemeProvider
   * toggles on the document element.
   */
  .dark {
    --editor-link: #6ea1ff;
    --editor-highlight: #fef08a;
    --editor-syntax-comment: #7d8799;
    --editor-syntax-punctuation: #a9b2c3;
    --editor-syntax-property: #e78bc9;
    --editor-syntax-selector: #9bdc7c;
    --editor-syntax-operator: #d4a373;
    --editor-syntax-attr: #6ea1ff;
    --editor-syntax-variable: #f0c674;
    --editor-syntax-function: #ff8a8a;
    --editor-syntax-keyword: #cda1ff;
  }

  .EditorTheme__code {
    background-color: transparent;
    font-family: Menlo, Consolas, Monaco, monospace;
    display: block;
    padding: 8px 8px 8px 52px;
    line-height: 1.53;
    font-size: 13px;
    margin: 8px 0;
    overflow-x: auto;
    border: 1px solid var(--border);
    position: relative;
    border-radius: 8px;
    tab-size: 2;
  }
  .EditorTheme__code:before {
    content: attr(data-gutter);
    position: absolute;
    background-color: transparent;
    border-right: 1px solid var(--border);
    left: 0;
    top: 0;
    padding: 8px;
    color: var(--muted-foreground);
    white-space: pre-wrap;
    text-align: right;
    min-width: 25px;
  }
  .EditorTheme__table {
    border-collapse: collapse;
    border-spacing: 0;
    overflow-y: scroll;
    overflow-x: scroll;
    table-layout: fixed;
    width: 100%;
    margin: 0 0 30px 0;
  }
  .EditorTheme__tokenComment {
    color: var(--editor-syntax-comment);
  }
  .EditorTheme__tokenPunctuation {
    color: var(--editor-syntax-punctuation);
  }
  .EditorTheme__tokenProperty {
    color: var(--editor-syntax-property);
  }
  .EditorTheme__tokenSelector {
    color: var(--editor-syntax-selector);
  }
  .EditorTheme__tokenOperator {
    color: var(--editor-syntax-operator);
  }
  .EditorTheme__tokenAttr {
    color: var(--editor-syntax-attr);
  }
  .EditorTheme__tokenVariable {
    color: var(--editor-syntax-variable);
  }
  .EditorTheme__tokenFunction {
    color: var(--editor-syntax-function);
  }

  .Collapsible__container {
    background-color: var(--background);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .Collapsible__title {
    padding: 0.25rem 0.25rem 0.25rem 1rem;
    position: relative;
    font-weight: bold;
    outline: none;
    cursor: pointer;
    list-style-type: disclosure-closed;
    list-style-position: inside;
  }
  .Collapsible__title p {
    display: inline-flex;
  }
  .Collapsible__title::marker {
    color: lightgray;
  }
  .Collapsible__container[open] > .Collapsible__title {
    list-style-type: disclosure-open;
  }
`;

/** Injects the editor's global design tokens, content styles, and utility classes. */
export function EditorGlobalStyles(): ReactNode {
  return <Global styles={[globalStyles, utilityStyles, editorThemeStyles]} />;
}
