import { css } from '@emotion/react';

import type { EditorThemeClasses } from 'lexical';

/**
 * The editor theme, ported from a Tailwind-based theme to emotion.
 *
 * Lexical's `EditorThemeClasses` expects CSS class-name strings, so each entry
 * is a static `EditorTheme__*` class name. The matching style payloads live in
 * `editorThemeStyles` below, which `global-styles.tsx` injects via emotion's
 * `<Global>` alongside the structural editor CSS.
 */

/** A two-tone focus ring: background-coloured offset ring plus primary ring. */
const RING = '0 0 0 2px var(--background), 0 0 0 4px var(--primary)';

/** All five unordered-list depths share the same disc styling. */
const UL_DEPTH = 'EditorTheme__ulDepth';

export const editorTheme: EditorThemeClasses = {
  ltr: 'EditorTheme__ltr',
  rtl: 'EditorTheme__rtl',
  heading: {
    h1: 'EditorTheme__h1',
    h2: 'EditorTheme__h2',
    h3: 'EditorTheme__h3',
    h4: 'EditorTheme__h4',
    h5: 'EditorTheme__h5',
    h6: 'EditorTheme__h6',
  },
  paragraph: 'EditorTheme__paragraph',
  quote: 'EditorTheme__quote',
  link: 'EditorTheme__link',
  list: {
    checklist: 'EditorTheme__checklist',
    listitem: 'EditorTheme__listitem',
    listitemChecked: 'EditorTheme__listitemChecked',
    listitemUnchecked: 'EditorTheme__listitemUnchecked',
    nested: {
      listitem: 'EditorTheme__nestedListitem',
    },
    ol: 'EditorTheme__ol',
    olDepth: [
      'EditorTheme__olDepth1',
      'EditorTheme__olDepth2',
      'EditorTheme__olDepth3',
      'EditorTheme__olDepth4',
      'EditorTheme__olDepth5',
    ],
    ul: 'EditorTheme__ul',
    ulDepth: [UL_DEPTH, UL_DEPTH, UL_DEPTH, UL_DEPTH, UL_DEPTH],
  },
  hashtag: 'EditorTheme__hashtag',
  text: {
    bold: 'EditorTheme__bold',
    code: 'EditorTheme__textCode',
    italic: 'EditorTheme__italic',
    strikethrough: 'EditorTheme__strikethrough',
    subscript: 'EditorTheme__subscript',
    superscript: 'EditorTheme__superscript',
    underline: 'EditorTheme__underline',
    underlineStrikethrough: 'EditorTheme__underlineStrikethrough',
  },
  image: 'editor-image',
  inlineImage: 'inline-editor-image',
  keyword: 'EditorTheme__keyword',
  code: 'EditorTheme__code',
  codeHighlight: {
    atrule: 'EditorTheme__tokenAttr',
    attr: 'EditorTheme__tokenAttr',
    boolean: 'EditorTheme__tokenProperty',
    builtin: 'EditorTheme__tokenSelector',
    cdata: 'EditorTheme__tokenComment',
    char: 'EditorTheme__tokenSelector',
    class: 'EditorTheme__tokenFunction',
    'class-name': 'EditorTheme__tokenFunction',
    comment: 'EditorTheme__tokenComment',
    constant: 'EditorTheme__tokenProperty',
    deleted: 'EditorTheme__tokenProperty',
    doctype: 'EditorTheme__tokenComment',
    entity: 'EditorTheme__tokenOperator',
    function: 'EditorTheme__tokenFunction',
    important: 'EditorTheme__tokenVariable',
    inserted: 'EditorTheme__tokenSelector',
    keyword: 'EditorTheme__tokenAttr',
    namespace: 'EditorTheme__tokenVariable',
    number: 'EditorTheme__tokenProperty',
    operator: 'EditorTheme__tokenOperator',
    prolog: 'EditorTheme__tokenComment',
    property: 'EditorTheme__tokenProperty',
    punctuation: 'EditorTheme__tokenPunctuation',
    regex: 'EditorTheme__tokenVariable',
    selector: 'EditorTheme__tokenSelector',
    string: 'EditorTheme__tokenSelector',
    symbol: 'EditorTheme__tokenProperty',
    tag: 'EditorTheme__tokenProperty',
    url: 'EditorTheme__tokenOperator',
    variable: 'EditorTheme__tokenVariable',
  },
  characterLimit: 'EditorTheme__characterLimit',
  table: 'EditorTheme__table',
  tableCell: 'EditorTheme__tableCell',
  tableCellActionButton: 'EditorTheme__tableCellActionButton',
  tableCellActionButtonContainer: 'EditorTheme__tableCellActionButtonContainer',
  tableCellEditing: 'EditorTheme__tableCellEditing',
  tableCellHeader: 'EditorTheme__tableCellHeader',
  tableCellPrimarySelected: 'EditorTheme__tableCellPrimarySelected',
  tableCellResizer: 'EditorTheme__tableCellResizer',
  tableCellSelected: 'EditorTheme__tableCellSelected',
  tableCellSortedIndicator: 'EditorTheme__tableCellSortedIndicator',
  tableResizeRuler: 'EditorTheme__tableCellResizeRuler',
  tableRowStriping: 'EditorTheme__tableRowStriping',
  tableSelected: 'EditorTheme__tableSelected',
  tableSelection: 'EditorTheme__tableSelection',
  layoutItem: 'EditorTheme__layoutItem',
  layoutContainer: 'EditorTheme__layoutContainer',
  autocomplete: 'EditorTheme__autocomplete',
  blockCursor: '',
  embedBlock: {
    base: 'EditorTheme__embedBlockBase',
    focus: 'EditorTheme__embedBlockFocus',
  },
  hr: 'EditorTheme__hr',
  indent: 'EditorTheme__indent',
  mark: '',
  markOverlap: '',
};

/**
 * Style payloads for the `editorTheme` class names above. Injected globally by
 * `global-styles.tsx` after the structural editor CSS, mirroring the append
 * order the emotion-generated classes previously had.
 */
export const editorThemeStyles = css`
  .EditorTheme__ltr {
    text-align: left;
  }
  .EditorTheme__rtl {
    text-align: right;
  }
  .EditorTheme__h1 {
    scroll-margin: 5rem;
    font-size: 2.25rem;
    line-height: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    @media (min-width: 1024px) {
      font-size: 3rem;
      line-height: 1;
    }
  }
  .EditorTheme__h2 {
    scroll-margin: 5rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    font-size: 1.875rem;
    line-height: 2.25rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    &:first-child {
      margin-top: 0;
    }
  }
  .EditorTheme__h3 {
    scroll-margin: 5rem;
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .EditorTheme__h4 {
    scroll-margin: 5rem;
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .EditorTheme__h5 {
    scroll-margin: 5rem;
    font-size: 1.125rem;
    line-height: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .EditorTheme__h6 {
    scroll-margin: 5rem;
    font-size: 1rem;
    line-height: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .EditorTheme__paragraph {
    line-height: 1.75rem;
    &:not(:first-child) {
      margin-top: 1.5rem;
    }
  }
  .EditorTheme__quote {
    margin-top: 1.5rem;
    border-left: 2px solid var(--border);
    padding-left: 1.5rem;
    font-style: italic;
  }
  .EditorTheme__link {
    color: #2563eb;
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }
  .EditorTheme__checklist {
    position: relative;
  }
  .EditorTheme__listitem {
    margin: 0 2rem;
  }
  .EditorTheme__listitemChecked {
    position: relative;
    margin: 0 0.5rem;
    padding: 0 1.5rem;
    list-style: none;
    outline: none;
    text-decoration: line-through;
    &::before {
      content: '';
      width: 1rem;
      height: 1rem;
      top: 0.125rem;
      left: 0;
      cursor: pointer;
      display: block;
      background-size: cover;
      position: absolute;
      border: 1px solid var(--primary);
      border-radius: 0.25rem;
      background-color: var(--primary);
      background-repeat: no-repeat;
    }
    &::after {
      content: '';
      cursor: pointer;
      border-color: #fff;
      border-style: solid;
      position: absolute;
      display: block;
      top: 6px;
      width: 3px;
      left: 7px;
      right: 7px;
      height: 6px;
      transform: rotate(45deg);
      border-width: 0 2px 2px 0;
    }
  }
  .EditorTheme__listitemUnchecked {
    position: relative;
    margin: 0 0.5rem;
    padding: 0 1.5rem;
    list-style: none;
    outline: none;
    &::before {
      content: '';
      width: 1rem;
      height: 1rem;
      top: 0.125rem;
      left: 0;
      cursor: pointer;
      display: block;
      background-size: cover;
      position: absolute;
      border: 1px solid var(--primary);
      border-radius: 0.25rem;
    }
  }
  .EditorTheme__nestedListitem {
    list-style: none;
    &::before,
    &::after {
      display: none;
    }
  }
  .EditorTheme__ol {
    margin: 0;
    padding: 0;
    list-style-type: decimal;
    & > li {
      margin-top: 0.5rem;
    }
  }
  .EditorTheme__olDepth1 {
    list-style-position: outside;
    list-style-type: decimal !important;
  }
  .EditorTheme__olDepth2 {
    list-style-position: outside;
    list-style-type: upper-roman !important;
  }
  .EditorTheme__olDepth3 {
    list-style-position: outside;
    list-style-type: lower-roman !important;
  }
  .EditorTheme__olDepth4 {
    list-style-position: outside;
    list-style-type: upper-alpha !important;
  }
  .EditorTheme__olDepth5 {
    list-style-position: outside;
    list-style-type: lower-alpha !important;
  }
  .EditorTheme__ul {
    margin: 0;
    padding: 0;
    list-style-position: outside;
    & > li {
      margin-top: 0.5rem;
    }
  }
  .EditorTheme__ulDepth {
    list-style-position: outside;
    list-style-type: disc !important;
  }
  .EditorTheme__hashtag {
    color: #2563eb;
    background-color: #dbeafe;
    border-radius: 0.375rem;
    padding: 0 0.25rem;
  }
  .EditorTheme__bold {
    font-weight: 700;
  }
  .EditorTheme__textCode {
    background-color: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.375rem;
  }
  .EditorTheme__italic {
    font-style: italic;
  }
  .EditorTheme__strikethrough {
    text-decoration: line-through;
  }
  .EditorTheme__subscript {
    vertical-align: sub;
    font-size: smaller;
  }
  .EditorTheme__superscript {
    vertical-align: super;
    font-size: smaller;
  }
  .EditorTheme__underline {
    text-decoration: underline;
  }
  .EditorTheme__underlineStrikethrough {
    text-decoration: underline line-through;
  }
  .editor-image {
    position: relative;
    display: inline-block;
    user-select: none;
    cursor: default;
  }
  .inline-editor-image {
    position: relative;
    display: inline-block;
    user-select: none;
    cursor: default;
  }
  .EditorTheme__keyword {
    color: #581c87;
    font-weight: 700;
  }
  .EditorTheme__characterLimit {
    background-color: color-mix(in srgb, var(--destructive), transparent 50%) !important;
  }
  .EditorTheme__table {
    width: fit-content;
    overflow: scroll;
    border-collapse: collapse;
  }
  .EditorTheme__tableCell {
    width: 6rem;
    position: relative;
    border: 1px solid var(--border);
    padding: 0.5rem 1rem;
    text-align: left;
    &[align='center'] {
      text-align: center;
    }
    &[align='right'] {
      text-align: right;
    }
  }
  .EditorTheme__tableCellActionButton {
    background-color: var(--background);
    display: block;
    border: 0;
    border-radius: 1rem;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--foreground);
    cursor: pointer;
  }
  .EditorTheme__tableCellActionButtonContainer {
    display: block;
    right: 0.25rem;
    top: 0.375rem;
    position: absolute;
    z-index: 10;
    width: 1.25rem;
    height: 1.25rem;
  }
  .EditorTheme__tableCellEditing {
    border-radius: 0.125rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }
  .EditorTheme__tableCellHeader {
    background-color: var(--muted);
    border: 1px solid var(--border);
    padding: 0.5rem 1rem;
    text-align: left;
    font-weight: 700;
    &[align='center'] {
      text-align: center;
    }
    &[align='right'] {
      text-align: right;
    }
  }
  .EditorTheme__tableCellPrimarySelected {
    border: 1px solid var(--primary);
    display: block;
    height: calc(100% - 2px);
    width: calc(100% - 2px);
    position: absolute;
    left: -1px;
    top: -1px;
    z-index: 10;
  }
  .EditorTheme__tableCellResizer {
    position: absolute;
    right: -0.25rem;
    height: 100%;
    width: 0.5rem;
    cursor: ew-resize;
    z-index: 10;
    top: 0;
  }
  .EditorTheme__tableCellSelected {
    background-color: var(--muted);
  }
  .EditorTheme__tableCellSortedIndicator {
    display: block;
    opacity: 0.5;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 0.25rem;
    background-color: var(--muted);
  }
  .EditorTheme__tableCellResizeRuler {
    display: block;
    position: absolute;
    width: 1px;
    height: 100%;
    background-color: var(--primary);
    top: 0;
  }
  .EditorTheme__tableRowStriping {
    margin: 0;
    border-top: 1px solid var(--border);
    padding: 0;
    &:nth-of-type(even) {
      background-color: var(--muted);
    }
  }
  .EditorTheme__tableSelected {
    box-shadow: ${RING};
  }
  .EditorTheme__tableSelection {
    background-color: transparent;
  }
  .EditorTheme__layoutItem {
    border: 1px dashed var(--border);
    padding: 0.5rem 1rem;
  }
  .EditorTheme__layoutContainer {
    display: grid;
    gap: 0.625rem;
    margin: 0.625rem 0;
  }
  .EditorTheme__autocomplete {
    color: var(--muted-foreground);
  }
  .EditorTheme__embedBlockBase {
    user-select: none;
  }
  .EditorTheme__embedBlockFocus {
    box-shadow: ${RING};
  }
  .EditorTheme__hr {
    padding: 0.125rem;
    border: none;
    margin: 0.25rem 0;
    cursor: pointer;
    &::after {
      content: '';
      display: block;
      height: 0.125rem;
      background-color: var(--muted);
    }
    &.selected {
      box-shadow: ${RING};
      user-select: none;
    }
  }
  .EditorTheme__indent {
    --lexical-indent-base-value: 40px;
  }
`;
