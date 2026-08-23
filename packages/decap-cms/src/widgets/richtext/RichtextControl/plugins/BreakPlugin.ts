import { createPlatePlugin, Key } from 'platejs/react';

import BreakElement from '@/widgets/richtext/RichtextControl/components/Element/BreakElement';

const BreakPlugin = createPlatePlugin({
  key: 'break',
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
    component: BreakElement,
  },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      // Handle shift+enter and only when there's a selection.
      if (event.key !== Key.Enter || !event.shiftKey || !editor.selection) {
        return;
      }

      editor.tf.insertNodes([{ type: 'break', children: [{ text: '' }] }, { text: '' }]);
      event.preventDefault();
      event.stopPropagation();
    },
  },
});

export default BreakPlugin;
