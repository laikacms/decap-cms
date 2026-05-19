// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import matchedAncestors from './matchedAncestors';

function lowestMatchedAncestor(editor, format) {
  return matchedAncestors(editor, format, 'lowest');
}
export default lowestMatchedAncestor;