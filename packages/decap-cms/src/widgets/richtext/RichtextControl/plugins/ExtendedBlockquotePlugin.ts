import { BlockquotePlugin } from '@platejs/basic-nodes/react';
import { PathApi } from 'platejs';
import { createPlatePlugin, Key } from 'platejs/react';

import type { NodeEntry, SlateEditor, TElement } from 'platejs';

interface NodeQuery {
  empty?: boolean | undefined;
  first?: boolean | undefined;
  start?: boolean | undefined;
  collapsed?: boolean | undefined;
}

function isWithinBlockquote(editor: SlateEditor, entry: NodeEntry<TElement>) {
  const blockAbove = editor.api.block({ at: entry[1], above: true });
  return blockAbove?.[0]?.type === BlockquotePlugin.key;
}

function queryNode(
  editor: SlateEditor,
  entry: NodeEntry<TElement>,
  { empty, first, start, collapsed }: NodeQuery,
) {
  return (
    (!empty || editor.api.isEmpty(entry[1]))
    && (!first || !PathApi.hasPrevious(entry[1]))
    && (!start || editor.api.isAt({ start: true }))
    && (!collapsed || editor.api.isCollapsed())
  );
}

function unwrap(editor: SlateEditor) {
  editor.tf.unwrapNodes({ split: true, match: n => n.type === BlockquotePlugin.key });
}

const ExtendedBlockquotePlugin = createPlatePlugin({
  key: 'blockquote',
  plugins: [BlockquotePlugin],
}).extendPlugin(BlockquotePlugin, {
  node: { isElement: true },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      const entry = editor.api.block();
      if (!entry) return;
      if (!isWithinBlockquote(editor, entry)) return;

      const rules: Array<{ key: string, query: NodeQuery }> = [
        { key: Key.Enter, query: { empty: true } },
        { key: Key.Backspace, query: { first: true, start: true, collapsed: true } },
      ];

      for (const rule of rules) {
        if (event.key === rule.key && queryNode(editor, entry, rule.query)) {
          unwrap(editor);
          event.preventDefault();
          event.stopPropagation();
          break;
        }
      }
    },
  },
});

export default ExtendedBlockquotePlugin;
