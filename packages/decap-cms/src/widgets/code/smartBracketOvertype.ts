import { EditorView } from '@codemirror/view';

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

export function smartBracketOvertype(): Extension {
  return EditorView.inputHandler.of((view, from, to, insert) => {
    if (view.compositionStarted || view.state.readOnly) return false;
    if (from !== to || insert.length !== 1 || !OVERTYPE_CHARS.has(insert)) return false;

    const sel = view.state.selection.main;
    if (!sel.empty || from !== sel.from) return false;

    const nextChar = view.state.doc.sliceString(from, from + 1);
    if (nextChar !== insert) return false;

    view.dispatch({
      selection: { anchor: from + 1 },
      scrollIntoView: true,
      userEvent: 'input.type',
    });
    return true;
  });
}
