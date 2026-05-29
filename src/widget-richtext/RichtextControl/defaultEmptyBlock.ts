// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import { ParagraphPlugin } from 'platejs/react';

function defaultEmptyBlock(text = '') {
  return {
    type: ParagraphPlugin.key,
    children: [{ text }],
  };
}

export default defaultEmptyBlock;