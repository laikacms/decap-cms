import { BlockquotePlugin } from '@platejs/basic-nodes/react';
import { unwrapList } from '@platejs/list-classic';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import ToolbarButton from './ToolbarButton';

import type { ToolbarButtonProps } from './ToolbarButton';

type BlockquoteToolbarButtonProps = Omit<ToolbarButtonProps, 'onClick' | 'isActive'>;

export default function BlockquoteToolbarButton(props: BlockquoteToolbarButtonProps) {
  const editor = useEditorRef();

  const pressed = useEditorSelector(
    editor => !!editor.api.node({ match: { type: BlockquotePlugin.key } }),
    [],
  );

  function handleClick() {
    unwrapList(editor);
    editor.tf.toggleBlock(BlockquotePlugin.key, { wrap: true });
    editor.tf.focus();
  }

  return <ToolbarButton isActive={pressed} onClick={handleClick} {...props} />;
}
