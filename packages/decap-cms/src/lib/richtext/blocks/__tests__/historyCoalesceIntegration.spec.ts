import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { $getNodeByKey, $getRoot, HISTORY_MERGE_TAG } from 'lexical';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $createBlockNode, $isBlockNode, BlockNode } from '@/lib/richtext/blocks/BlockNode';
import { shouldCoalesceHistoryEdit } from '@/lib/richtext/blocks/historyCoalesce';
import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';

import type { LexicalEditor, NodeKey } from 'lexical';
import type { LastHistoryEdit } from '@/lib/richtext/blocks/historyCoalesce';
import type { HistoryState } from '@lexical/history';

/**
 * DCMS-1489: exercises the real Lexical history plugin (`registerHistory`,
 * the same one wired up in `Editor.tsx` via `HistoryExtension`) against the
 * exact tagging decision `BlockComponent.updateData` makes, to prove rapid
 * same-block edits collapse into one undo entry while a paused or
 * different-block edit still gets its own.
 */

/** Mirrors `BlockComponent.updateData`'s tagging + persist-notify logic. */
function makeUpdateData(editor: LexicalEditor, onPersist: (data: Record<string, unknown>) => void) {
  let last: LastHistoryEdit | null = null;
  return (nodeKey: NodeKey, next: Record<string, unknown>, now: number) => {
    const tag = shouldCoalesceHistoryEdit(last, nodeKey, now) ? HISTORY_MERGE_TAG : undefined;
    last = { nodeKey, time: now };

    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if ($isBlockNode(node)) node.setData(next);
      },
      tag ? { tag, discrete: true } : { discrete: true },
    );
    // Mirrors `OnChangePlugin` configured with `ignoreHistoryMergeTagChange={false}`
    // in `Editor.tsx`: the persist path runs unconditionally, tagged or not.
    onPersist(next);
  };
}

function insertBlock(editor: LexicalEditor, componentId = 'youtube'): NodeKey {
  let key = '';
  editor.update(
    () => {
      const node = $createBlockNode(componentId, {});
      $getRoot().append(node);
      key = node.getKey();
    },
    { discrete: true },
  );
  return key;
}

function setUpHistory(editor: LexicalEditor): HistoryState {
  const historyState = createEmptyHistoryState();
  // 300ms is Lexical's own default merge delay; irrelevant here since our
  // block edits are always tagged (merge) or untagged (push) explicitly.
  registerHistory(editor, historyState, 300);
  return historyState;
}

/**
 * The number of logical undo entries: Lexical keeps the *latest* entry in
 * `historyState.current` (not yet pushed onto `undoStack`) until a further
 * `HISTORY_PUSH` demotes it, so the true entry count is the stack depth plus
 * one for `current` (when present).
 */
function undoEntryCount(history: HistoryState): number {
  return history.undoStack.length + (history.current !== null ? 1 : 0);
}

describe('BlockComponent history coalescing (DCMS-1489)', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createHeadlessEditor([BlockNode]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collapses rapid successive edits to the same block into one undo entry', () => {
    const nodeKey = insertBlock(editor);
    const history = setUpHistory(editor);
    const persisted: unknown[] = [];
    const updateData = makeUpdateData(editor, data => persisted.push(data));

    let now = 10_000;
    updateData(nodeKey, { id: 'a' }, now);
    now += 100;
    updateData(nodeKey, { id: 'ab' }, now);
    now += 100;
    updateData(nodeKey, { id: 'abc' }, now);

    // Every intermediate value still reached the persist path.
    expect(persisted).toEqual([{ id: 'a' }, { id: 'ab' }, { id: 'abc' }]);

    // But only the first edit pushed a new undo entry; the next two merged
    // into it, so there's still just one logical entry.
    expect(undoEntryCount(history)).toBe(1);
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      expect($isBlockNode(node) && node.getData()).toEqual({ id: 'abc' });
    });
  });

  it('starts a new undo entry once the coalescing window elapses', () => {
    const nodeKey = insertBlock(editor);
    const history = setUpHistory(editor);
    const updateData = makeUpdateData(editor, () => {});

    let now = 10_000;
    updateData(nodeKey, { id: 'a' }, now);
    now += 100;
    updateData(nodeKey, { id: 'ab' }, now); // merges into the first entry

    now += 2_000; // well past the coalescing window
    updateData(nodeKey, { id: 'abz' }, now); // starts a fresh entry

    expect(undoEntryCount(history)).toBe(2);
  });

  it('starts a new undo entry when focus moves to a different block', () => {
    const nodeKeyA = insertBlock(editor, 'youtube');
    const nodeKeyB = insertBlock(editor, 'youtube');
    const history = setUpHistory(editor);
    const updateData = makeUpdateData(editor, () => {});

    let now = 10_000;
    updateData(nodeKeyA, { id: 'a1' }, now);
    now += 50;
    updateData(nodeKeyA, { id: 'a2' }, now); // merges (same block)

    now += 50;
    updateData(nodeKeyB, { id: 'b1' }, now); // different block: new entry

    expect(undoEntryCount(history)).toBe(2);
  });
});
