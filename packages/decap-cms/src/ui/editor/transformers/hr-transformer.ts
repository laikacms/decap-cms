import { $createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode } from '@lexical/extension';

import type { ElementTransformer } from '@lexical/markdown';
import type { LexicalNode } from 'lexical';

export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: parentNode => {
    const line = $createHorizontalRuleNode();

    // `parentNode` is the paragraph the "---" shortcut/markdown line matched
    // on. Both callers (interactive typing via MarkdownShortcutsExtension
    // and markdown import via $convertFromMarkdownString in
    // table-transformer.ts) create that paragraph fresh right before this
    // runs, so it never has a next sibling at import time -- any node that
    // would follow the horizontal rule in the source hasn't been appended
    // yet. That leaves `parentNode` empty either way, so replacing it
    // outright when something already follows it (the mid-document typing
    // case) and otherwise inserting the rule before it (so it survives as
    // the landing spot to keep typing in) is correct for both callers.
    if (parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element',
};
