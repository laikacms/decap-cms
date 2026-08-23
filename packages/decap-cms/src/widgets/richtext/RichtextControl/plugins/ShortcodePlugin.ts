import { createSlatePlugin } from 'platejs';
import { toPlatePlugin } from 'platejs/react';

import ShortcodeElement from '@/widgets/richtext/RichtextControl/components/Element/ShortcodeElement';

const ShortcodePlugin = toPlatePlugin(
  createSlatePlugin({
    key: 'shortcode',
    node: {
      isElement: true,
      isVoid: true,
      component: ShortcodeElement,
    },
  }),
);

export default ShortcodePlugin;
