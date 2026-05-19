// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { createSlatePlugin } from 'platejs';
import { toPlatePlugin } from 'platejs/react';

import ShortcodeElement from '../components/Element/ShortcodeElement';

const plugin = createSlatePlugin({
  key: 'shortcode',
  node: {
    isElement: true,
    isVoid: true,
    component: ShortcodeElement,
  },
});
const ShortcodePlugin = toPlatePlugin(plugin);

export default ShortcodePlugin;