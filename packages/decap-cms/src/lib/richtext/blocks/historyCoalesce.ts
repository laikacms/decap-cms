import type { NodeKey } from 'lexical';

/**
 * Coalescing window (ms) for {@link shouldCoalesceHistoryEdit}: successive
 * edits to the same block within this gap are treated as one logical edit
 * for undo purposes (mirrors typical debounce/typing-pause windows).
 */
export const HISTORY_COALESCE_WINDOW_MS = 750;

/**
 * Rides alongside Lexical's own `HISTORY_MERGE_TAG` on coalesced block edits
 * (`BlockComponent.updateData`). `OnChangePlugin`'s default
 * `ignoreHistoryMergeTagChange` filter can't distinguish *why* an update is
 * tagged `history-merge` — `LexicalComposer`'s initial-state hydration and
 * `AutoCompletePlugin`'s ghost-suggestion preview use the same tag to hide
 * from the persist path on purpose. `Editor.tsx` disables that blanket
 * filter and reimplements it, using this tag as the one exception: present
 * ⇒ still a real prop edit that must reach persist; absent ⇒ keep ignoring
 * history-merge updates as before.
 */
export const BLOCK_HISTORY_MERGE_TAG = 'decap-block-history-merge';

/** The last edit `updateData` tagged for history-merge purposes. */
export interface LastHistoryEdit {
  nodeKey: NodeKey;
  time: number;
}

/**
 * Decides whether a block prop edit should be tagged `history-merge` (so
 * Lexical's history plugin folds it into the current undo entry) instead of
 * starting a new one.
 *
 * True only when the previous tracked edit was to the *same* node and
 * happened within {@link windowMs} of `now`. A different node, no previous
 * edit, or a gap past the window all start a fresh undo entry.
 */
export function shouldCoalesceHistoryEdit(
  last: LastHistoryEdit | null,
  nodeKey: NodeKey,
  now: number,
  windowMs: number = HISTORY_COALESCE_WINDOW_MS,
): boolean {
  if (last === null) return false;
  if (last.nodeKey !== nodeKey) return false;
  return now - last.time < windowMs;
}
