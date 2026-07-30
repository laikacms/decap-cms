import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { $getNodeByKey, HISTORY_MERGE_TAG } from 'lexical';
import { useCallback, useRef, useState } from 'react';

import { $isBlockNode } from './BlockNode';
import { useBlocksConfig } from './blocksContext';
import { BLOCK_HISTORY_MERGE_TAG, shouldCoalesceHistoryEdit } from './historyCoalesce';
import { $isInlineBlockNode } from './InlineBlockNode';

import type { NodeKey } from 'lexical';
import type { ReactNode } from 'react';
import type { LastHistoryEdit } from './historyCoalesce';
import type { BlockChromeProps, BlockData } from './types';

/** Props `BlockNode`/`InlineBlockNode` pass from `decorate()`. */
export interface BlockComponentProps {
  componentId: string;
  data: BlockData;
  nodeKey: NodeKey;
  /** True when rendered by an `InlineBlockNode` (an inline PT object). */
  inline?: boolean;
}

/**
 * The single render seam for custom blocks inside the Lexical editor.
 *
 * Resolves the block definition and chrome from `BlocksProvider` context
 * (decorators are portal-rendered inside the composer tree, so context set
 * above the composer is visible here) and owns the editing state. The chrome
 * itself is injected (`renderBlockChrome`; `ui/editor` supplies the default)
 * so this file stays free of UI-layer imports.
 */
export function BlockComponent({
  componentId,
  data,
  nodeKey,
  inline = false,
}: BlockComponentProps): ReactNode {
  const [editor] = useLexicalComposerContext();
  const [, setSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(false);
  const config = useBlocksConfig();
  const definition = config.blocks?.[componentId];

  // Tracks the last edit tagged for history-merge purposes (DCMS-1489), so
  // rapid successive edits to the *same* block coalesce into one undo entry
  // instead of one per keystroke.
  //
  // Coalesced updates carry both `HISTORY_MERGE_TAG` (so Lexical's history
  // plugin folds them into the current undo entry) and `BLOCK_HISTORY_MERGE_TAG`
  // (a marker `Editor.tsx`'s `OnChangePlugin` handler checks for). Untagged
  // `HISTORY_MERGE_TAG` updates — e.g. `LexicalComposer`'s initial-state
  // hydration — are still hidden from persist; ours, marked, are not, so
  // the persist path keeps seeing
  // every prop edit regardless of undo grouping.
  const lastHistoryEditRef = useRef<LastHistoryEdit | null>(null);

  const updateData = useCallback(
    (next: BlockData) => {
      const now = Date.now();
      const coalesce = shouldCoalesceHistoryEdit(lastHistoryEditRef.current, nodeKey, now);
      lastHistoryEditRef.current = { nodeKey, time: now };

      editor.update(
        () => {
          const node = $getNodeByKey(nodeKey);
          if ($isBlockNode(node) || $isInlineBlockNode(node)) node.setData(next);
        },
        coalesce ? { tag: [HISTORY_MERGE_TAG, BLOCK_HISTORY_MERGE_TAG] } : undefined,
      );
    },
    [editor, nodeKey],
  );

  const openEditor = useCallback(() => {
    setSelected(true);
    setIsEditing(true);
  }, [setSelected]);

  const closeEditor = useCallback(() => setIsEditing(false), []);

  const chromeProps: BlockChromeProps = {
    definition,
    componentId,
    data,
    nodeKey,
    inline,
    isEditing,
    openEditor,
    closeEditor,
    updateData,
  };

  if (config.renderBlockChrome) return config.renderBlockChrome(chromeProps);

  // No chrome provider (headless/tests): keep the block visible and its data
  // intact instead of rendering nothing.
  const label = definition?.label ?? componentId;
  if (inline) return <span data-decap-block={componentId}>[{label}]</span>;
  return <div data-decap-block={componentId}>[{label}]</div>;
}
