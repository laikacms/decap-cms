// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
function defaultEmptyBlock(text = '') {
  return {
    type: 'paragraph',
    children: [{ text }],
  };
}

export default defaultEmptyBlock;