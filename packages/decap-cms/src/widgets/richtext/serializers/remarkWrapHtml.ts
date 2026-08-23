import u from 'unist-builder';

import type { MdastNode, MdastRoot } from '@/widgets/richtext/types';

/**
 * Ensure that top level 'html' type nodes are wrapped in paragraphs. Html nodes
 * are used for text nodes that we don't want Remark or Rehype to parse.
 */
export default function remarkWrapHtml() {
  function transform(tree: MdastRoot): MdastRoot {
    tree.children = tree.children.map(node => {
      if (node.type === 'html') {
        return u<MdastNode>('paragraph', [node]);
      }
      return node;
    });

    return tree;
  }

  return transform;
}
