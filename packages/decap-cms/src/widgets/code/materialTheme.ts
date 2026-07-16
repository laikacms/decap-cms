// Material dark theme for CodeMirror 6, built on the official theming APIs
// (`EditorView.theme` + `HighlightStyle`). The palette is ported from the
// widget's previous `@uiw/codemirror-theme-material` dependency (MIT) so the
// user-facing "material" theme option keeps its exact look.
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

import type { Extension } from '@codemirror/state';

export const materialBackground = '#2e3235';

const background = materialBackground;
const foreground = '#bdbdbd';
const caret = '#a0a4ae';
const selection = '#d7d4f063';
const lineHighlight = '#545b6130';

const materialChrome = EditorView.theme(
  {
    '&': {
      backgroundColor: background,
      color: foreground,
    },
    '.cm-content': {
      caretColor: caret,
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: caret,
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: selection,
      },
    '.cm-selectionMatch': {
      backgroundColor: selection,
    },
    '.cm-activeLine': {
      backgroundColor: lineHighlight,
    },
    '.cm-gutters': {
      backgroundColor: background,
      color: '#999',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: lineHighlight,
      color: '#4f5b66',
    },
  },
  { dark: true },
);

const materialHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#cf6edf' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#56c8d8' },
  { tag: [t.propertyName], color: '#facf4e' },
  { tag: [t.variableName], color: '#bdbdbd' },
  { tag: [t.function(t.variableName)], color: '#56c8d8' },
  { tag: [t.labelName], color: '#cf6edf' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#facf4e' },
  { tag: [t.definition(t.name), t.separator], color: '#fa5788' },
  { tag: [t.brace], color: '#cf6edf' },
  { tag: [t.annotation], color: '#ff5f52' },
  {
    tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: '#ffad42',
  },
  { tag: [t.typeName, t.className], color: '#ffad42' },
  { tag: [t.operator, t.operatorKeyword], color: '#7186f0' },
  { tag: [t.tagName], color: '#99d066' },
  { tag: [t.squareBracket], color: '#ff5f52' },
  { tag: [t.angleBracket], color: '#606f7a' },
  { tag: [t.attributeName], color: '#bdbdbd' },
  { tag: [t.regexp], color: '#ff5f52' },
  { tag: [t.quote], color: '#6abf69' },
  { tag: [t.string], color: '#99d066' },
  {
    tag: t.link,
    color: '#56c8d8',
    textDecoration: 'underline',
    textUnderlinePosition: 'under',
  },
  { tag: [t.url, t.escape, t.special(t.string)], color: '#facf4e' },
  { tag: [t.meta], color: '#707d8b' },
  { tag: [t.comment], color: '#707d8b', fontStyle: 'italic' },
  { tag: t.monospace, color: '#bdbdbd' },
  { tag: t.strong, fontWeight: 'bold', color: '#ff5f52' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#99d066' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.heading, fontWeight: 'bold', color: '#facf4e' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#56c8d8' },
  { tag: [t.processingInstruction, t.inserted], color: '#ff5f52' },
  { tag: [t.contentSeparator], color: '#56c8d8' },
  { tag: t.invalid, color: '#606f7a', borderBottom: '1px dotted #ff5f52' },
]);

export const materialTheme: Extension = [
  materialChrome,
  syntaxHighlighting(materialHighlightStyle),
];
