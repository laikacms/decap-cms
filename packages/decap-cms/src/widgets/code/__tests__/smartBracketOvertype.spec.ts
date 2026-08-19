import { closeBrackets } from '@codemirror/autocomplete';
import { insertNewlineAndIndent } from '@codemirror/commands';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';

import { smartBracketOvertype } from '@/widgets/code/smartBracketOvertype';

import type { Extension } from '@codemirror/state';

// DCMS-2186 / DCMS-2193: `closeBrackets()`'s own skip-over only fires while
// the cursor stays adjacent to the bracket it auto-inserted; pressing Enter
// to open a block moves that closer onto its own line and breaks the
// adjacency, so the user's own closing character used to insert fresh
// instead of being swallowed, leaving a duplicate `}`/`)`/`]`/quote.
describe('smartBracketOvertype (DCMS-2186 / DCMS-2193)', () => {
  function makeView(doc: string, extensions: Extension[]) {
    return new EditorView({
      state: EditorState.create({ doc, extensions }),
    });
  }

  function setup() {
    return makeView('', [smartBracketOvertype(), closeBrackets()]);
  }

  // Loads the real `javascript` grammar the same way the widget's
  // `languageLoaders.ts` does (`LanguageDescription` + lazy `.load()` from
  // `@codemirror/language-data`), so the Enter keymap below goes through
  // the same language-aware indentation path a real editor session would.
  async function setupWithLanguage() {
    const description = LanguageDescription.matchLanguageName(languages, 'javascript', false);
    const language = description ? await description.load() : [];
    return makeView('', [language, smartBracketOvertype(), closeBrackets()]);
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

  // DCMS-2193: the previous version of this helper did
  // `view.dispatch(view.state.replaceSelection('\n'))` — a synthetic Enter
  // that never invokes CodeMirror's real Enter keymap/`indentOnInput`
  // behavior. That made the "block-open" scenario below false-green: with a
  // bare `\n`, the closer always stayed adjacent to the cursor (no gap),
  // so the bug this suite claims to catch never actually reproduced.
  // `insertNewlineAndIndent` is the exact command `defaultKeymap` binds to
  // Enter (see `@codemirror/commands`), including its "cursor sits between
  // a matching bracket pair" explode behavior that opens the gap.
  function pressEnter(view: EditorView) {
    insertNewlineAndIndent(view);
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

  // `{`, `(`, `[` are recognized by CodeMirror's `insertNewlineAndIndent`
  // as a matching bracket pair (see `isBetweenBrackets` in
  // `@codemirror/commands`) even without a language extension, so pressing
  // Enter right after the auto-close explodes them onto their own line —
  // reproducing the real DCMS-2193 flow end to end.
  it.each([
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ])('does not duplicate %s%s after closeBrackets + real Enter keymap on a block-open flow', (open, close) => {
    const view = setup();

    typeChar(view, open);
    pressEnter(view);
    typeString(view, 'body');
    pressEnter(view);
    typeChar(view, close);

    expect(view.state.doc.toString()).toBe(`${open}\nbody\n${close}`);

    view.destroy();
  });

  // Quote characters are not recognized as a bracket pair by
  // `insertNewlineAndIndent` (there is no generic open/close node for
  // plain string quotes), so the real Enter keymap never explodes them
  // onto their own line the way it does `{`/`(`/`[` — the cursor and the
  // auto-inserted closing quote move together through every Enter. This
  // asserts that still holds (no duplicate quote) using the real keymap,
  // and the codemirror language-data-loaded grammar from a real editor
  // session, rather than assuming it from the bracket cases above.
  it.each([
    ['"', '"'],
    ["'", "'"],
  ])('does not duplicate %s%s after closeBrackets + real Enter keymap', async (open, close) => {
    const view = await setupWithLanguage();

    typeChar(view, open);
    pressEnter(view);
    typeString(view, 'body');
    pressEnter(view);
    typeChar(view, close);

    const doc = view.state.doc.toString();
    // `open === close` for quotes, so a single opening + single closing
    // quote is 2 total occurrences of the character, not a duplicate.
    expect(doc.split(close).length - 1).toBe(2);
    expect(doc.endsWith(close)).toBe(true);

    view.destroy();
  });

  it('still inserts a fresh closing character when there is nothing to overtype', () => {
    const view = setup();

    typeChar(view, '}');

    expect(view.state.doc.toString()).toBe('}');

    view.destroy();
  });

  // Directly exercises the new "blank line, then the closer as the next
  // line's first non-whitespace character" detection added for DCMS-2193,
  // for every overtype-eligible character, independent of whether
  // CodeMirror's real Enter keymap happens to produce that exact shape for
  // a given character. This is the shape `{\n  body\n  |\n}` collapses
  // into after the second Enter in the scenarios above.
  it.each([
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
    ['"', '"'],
    ["'", "'"],
  ])('overtypes %s%s across a blank-line gap left by the block-open flow', (open, close) => {
    const doc = `${open}\n  body\n  \n${close}`;
    const cursor = doc.indexOf('\n  \n') + 1 + 2; // start of the blank line, after its indentation
    const view = makeView(doc, [smartBracketOvertype(), closeBrackets()]);
    view.dispatch({ selection: { anchor: cursor } });

    typeChar(view, close);

    expect(view.state.doc.toString()).toBe(`${open}\n  body\n${close}`);

    view.destroy();
  });

  it('does not overtype across more than one blank line', () => {
    const doc = '{\n  \n  \n}';
    const cursor = 4; // end of the first blank line's indentation ("{\n  |\n  \n}")
    const view = makeView(doc, [smartBracketOvertype(), closeBrackets()]);
    view.dispatch({ selection: { anchor: cursor } });

    typeChar(view, '}');

    // Two blank lines separate the cursor from the pre-existing closer, so
    // the guard must not fire: a fresh `}` is inserted instead of skipping
    // ahead to the real one.
    expect(view.state.doc.toString()).toBe('{\n  }\n  \n}');

    view.destroy();
  });

  it('does not overtype when the next line does not start with the pending closer', () => {
    const doc = '{\n  \nelse\n}';
    const cursor = 4; // end of the blank line's indentation ("{\n  |\nelse\n}")
    const view = makeView(doc, [smartBracketOvertype(), closeBrackets()]);
    view.dispatch({ selection: { anchor: cursor } });

    typeChar(view, '}');

    expect(view.state.doc.toString()).toBe('{\n  }\nelse\n}');

    view.destroy();
  });
});
