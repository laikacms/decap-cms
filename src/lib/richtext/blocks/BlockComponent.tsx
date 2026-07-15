import { useCallback, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { $getNodeByKey } from 'lexical';

import { $isBlockNode } from './BlockNode';
import { $isInlineBlockNode } from './InlineBlockNode';
import { useBlocksConfig } from './blocksContext';

import type { NodeKey } from 'lexical';
import type { ReactNode } from 'react';
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

  const updateData = useCallback(
    (next: BlockData) => {
      // Deliberately untagged: OnChangePlugin ignores 'history-merge'-tagged
      // updates by default, and the persist path must see every prop edit.
      // Trade-off: block prop edits get per-change undo entries.
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isBlockNode(node) || $isInlineBlockNode(node)) node.setData(next);
      });
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
