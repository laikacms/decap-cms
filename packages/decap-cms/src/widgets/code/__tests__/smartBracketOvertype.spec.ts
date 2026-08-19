import { closeBrackets } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';

import { smartBracketOvertype } from '@/widgets/code/smartBracketOvertype';

// DCMS-2186: `closeBrackets()`'s own skip-over only fires while the cursor
// stays adjacent to the bracket it auto-inserted; pressing Enter to open a
// block moves that closer onto its own line and breaks the adjacency, so
// the user's own closing character used to insert fresh instead of being
// swallowed, leaving a duplicate `}`/`)`/`]`/quote.
describe('smartBracketOvertype (DCMS-2186)', () => {
  function setup() {
    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [smartBracketOvertype(), closeBrackets()],
      }),
    });
    return view;
  }

  // Mirrors how CodeMirror's own DOM input handling invokes the
  // `EditorView.inputHandler` facet (see `@codemirror/view`'s
  // `applyDOMChange`): try each handler in order, falling back to a plain
  // insert if none of them claim the input.
  function typeChar(view: EditorView, ch: string) {
    const sel = view.state.selection.main;
    const handlers = view.state.facet(EditorView.inputHandler);
    const handled = handlers.some(handler => handler(view, sel.from, sel.to, ch));
    if (!handled) {
      view.dispatch(view.state.replaceSelection(ch));
    }
  }

  function typeString(view: EditorView, text: string) {
    for (const ch of text) typeChar(view, ch);
  }

  function pressEnter(view: EditorView) {
    view.dispatch(view.state.replaceSelection('\n'));
  }

  it('does not duplicate `}` after closeBrackets + Enter on a block-open flow', () => {
    const view = setup();

    typeString(view, 'function test() {');
    pressEnter(view);
    typeString(view, '  return true;');
    pressEnter(view);
    typeChar(view, '}');

    expect(view.state.doc.toString()).toBe('function test() {\n  return true;\n}');

    view.destroy();
  });

  it.each([
    ['(', ')'],
    ['[', ']'],
    ['"', '"'],
    ["'", "'"],
  ])('does not duplicate %s%s after closeBrackets + Enter', (open, close) => {
    const view = setup();

    typeChar(view, open);
    pressEnter(view);
    typeString(view, 'body');
    pressEnter(view);
    typeChar(view, close);

    expect(view.state.doc.toString()).toBe(`${open}\nbody\n${close}`);

    view.destroy();
  });

  it('still inserts a fresh closing character when there is nothing to overtype', () => {
    const view = setup();

    typeChar(view, '}');

    expect(view.state.doc.toString()).toBe('}');

    view.destroy();
  });
});
