import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { BlockNode } from '@/lib/richtext/blocks/BlockNode';
import { InlineBlockNode } from '@/lib/richtext/blocks/InlineBlockNode';

import type { Klass, LexicalNode } from 'lexical';

/**
 * The node set registered on every headless editor and editor instance.
 * Keep this in sync with the nodes the widget's editor enables.
 */
export const DEFAULT_NODES: ReadonlyArray<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  BlockNode,
  InlineBlockNode,
];
