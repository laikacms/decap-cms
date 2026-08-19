import { EditorView } from '@codemirror/view';

import type { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

// `@codemirror/autocomplete`'s `closeBrackets()` only "overtypes" (skips
// past) an auto-inserted closer while the cursor stays adjacent to it: its
// tracking field drops the pending closer as soon as the selection moves to
// a different line (see `bracketState.update` in
// `@codemirror/autocomplete`). Pressing Enter right after an auto-closed
// bracket — the common "open a block" flow, e.g. `{` + Enter + body + Enter
// + `}` — moves the closer to its own line, so that tracking is lost and
// the user's own closing character is inserted fresh instead of swallowed,
// leaving a duplicate `}`/`)`/`]`/quote (DCMS-2186).
//
// This extension works around that by handling type-over itself, without
// relying on `closeBrackets()`'s per-line tracking: whenever the typed
// character is one of the closing characters and the character immediately
// to the right of the cursor is already that same character, move the
// cursor past it instead of inserting a new one. It must be registered
// ahead of `closeBrackets()` so it gets first refusal on the input event.
const OVERTYPE_CHARS = new Set([')', ']', '}', '"', "'"]);

// DCMS-2193: the literal `nextChar === insert` check above only covers a
// closer sitting immediately to the right of the cursor. A real "open a
// block" flow also goes through the language's Enter keymap
// (`insertNewlineAndIndent`, see `@codemirror/commands`), which — when the
// cursor sits directly between a matching open/close pair — "explodes" the
// pair onto three lines: the opener's line, a fresh blank indented line for
// the cursor, and the closer's own line. Pressing Enter again to start a
// new line for the closer (the natural next step) leaves the cursor on a
// second blank line immediately above the one holding the pre-existing
// closer, e.g. `{\n  body\n  |\n}`. The closer is no longer at `from + 1`,
// so the literal check above no-ops and `closeBrackets()` inserts a
// duplicate.
//
// To handle that shape without over-broadening into "skip any whitespace
// anywhere," this only looks one line ahead, and only when it's a precise
// match for that exact gap: the remainder of the cursor's own line must be
// blank (i.e. the cursor sits on a line with nothing but whitespace after
// it — the fresh line the second Enter created), and the very first
// non-whitespace character of the *next* line must be the pending closer
// (i.e. that next line is exactly the one the earlier explode left
// behind). Any other shape (more than one blank line, unrelated content
// before the closer, cursor mid-line) is left alone.
interface OvertypeTarget {
  /** Start of the range to delete (the indentation-only content of the
   * cursor's blank line, if any — nothing to delete in the plain adjacent
   * case, where this equals `from`). */
  deleteFrom: number;
  /** Position of the pre-existing closer, i.e. the end of the range to
   * delete: everything between `deleteFrom` and here collapses away, the
   * closer itself is kept. */
  closerPos: number;
}

function findOvertypeTarget(state: EditorState, from: number, insert: string): OvertypeTarget | null {
  if (state.doc.sliceString(from, from + 1) === insert) {
    return { deleteFrom: from, closerPos: from };
  }

  const line = state.doc.lineAt(from);
  if (state.doc.sliceString(from, line.to).trim() !== '') return null;
  if (line.number >= state.doc.lines) return null;

  const nextLine = state.doc.line(line.number + 1);
  const leadingWhitespaceLength = /^\s*/.exec(nextLine.text)![0].length;
  if (nextLine.text[leadingWhitespaceLength] !== insert) return null;

  return { deleteFrom: line.from, closerPos: nextLine.from + leadingWhitespaceLength };
}

export function smartBracketOvertype(): Extension {
  return EditorView.inputHandler.of((view, from, to, insert) => {
    if (view.compositionStarted || view.state.readOnly) return false;
    if (from !== to || insert.length !== 1 || !OVERTYPE_CHARS.has(insert)) return false;

    const sel = view.state.selection.main;
    if (!sel.empty || from !== sel.from) return false;

    const target = findOvertypeTarget(view.state, from, insert);
    if (target === null) return false;

    view.dispatch({
      changes: { from: target.deleteFrom, to: target.closerPos, insert: '' },
      selection: { anchor: target.deleteFrom + 1 },
      scrollIntoView: true,
      userEvent: 'input.type',
    });
    return true;
  });
}
