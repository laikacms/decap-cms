import { ParagraphPlugin } from 'platejs/react';

import type { SlateNode } from '@/widgets/richtext/types';

export default function defaultEmptyBlock(text = ''): SlateNode {
  return {
    type: ParagraphPlugin.key,
    children: [{ text }],
  };
}
