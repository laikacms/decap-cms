// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { Transforms } from 'slate';

import isCursorInEmptyParagraph from './locations/isCursorInEmptyParagraph';

function insertShortcode(editor, pluginConfig) {
  const defaultValues = {};
  for (const field of pluginConfig.fields || []) {
    defaultValues[field.name] = field.default ?? '';
  }

  const nodeData = {
    type: 'shortcode',
    id: pluginConfig.id,
    data: {
      shortcode: pluginConfig.id,
      shortcodeNew: true,
      shortcodeData: defaultValues,
    },
    children: [{ text: '' }],
  };

  if (isCursorInEmptyParagraph(editor)) {
    Transforms.setNodes(editor, nodeData);
    return;
  }

  Transforms.insertNodes(editor, nodeData);
}

export default insertShortcode;