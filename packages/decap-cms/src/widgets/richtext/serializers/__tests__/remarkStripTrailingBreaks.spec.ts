import unified from 'unified';
import u from 'unist-builder';
import { describe, expect, it } from 'vitest';

import remarkStripTrailingBreaks from '@/widgets/richtext/serializers/remarkStripTrailingBreaks';

import type { MdastNode, MdastRoot } from '@/widgets/richtext/types';

function process(children: MdastNode[]) {
  const tree = u<MdastRoot>('root', children);
  const strippedMdast = unified().use(remarkStripTrailingBreaks).runSync<MdastRoot>(tree);

  return strippedMdast.children;
}

describe('remarkStripTrailingBreaks', () => {
  it('should remove trailing breaks at the end of a block', () => {
    expect(process([u<MdastNode>('break')])).toEqual([]);
    expect(process([u<MdastNode>('break'), u<MdastNode>('text', '\n  \n')])).toEqual([
      u<MdastNode>('text', '\n  \n'),
    ]);
    expect(process([u<MdastNode>('text', 'a'), u<MdastNode>('break')])).toEqual([
      u<MdastNode>('text', 'a'),
    ]);
  });

  it('should not remove trailing breaks that are not at the end of a block', () => {
    expect(process([u<MdastNode>('break'), u<MdastNode>('text', 'a')])).toEqual([
      u<MdastNode>('break'),
      u<MdastNode>('text', 'a'),
    ]);
  });
});
