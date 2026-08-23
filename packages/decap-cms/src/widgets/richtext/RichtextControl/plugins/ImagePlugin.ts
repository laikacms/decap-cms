import { createSlatePlugin } from 'platejs';
import { toPlatePlugin } from 'platejs/react';

const ImagePlugin = toPlatePlugin(
  createSlatePlugin({
    key: 'image',
    node: {
      isElement: true,
      isInline: true,
      isVoid: true,
    },
  }),
);

export default ImagePlugin;
