import { describe, expect, it } from 'vitest';

import { mergeAdjacentTexts } from '@/widgets/richtext/serializers/remarkSlate';

import type { SlateNode } from '@/widgets/richtext/types';

const openTag = '<a href="https://www.netlify.com" target="_blank">';
const closeTag = '</a>';

describe('remarkSlate', () => {
  describe('mergeAdjacentTexts', () => {
    it('should handle empty array', () => {
      const children: SlateNode[] = [];
      expect(mergeAdjacentTexts(children)).toBe(children);
    });

    it('should merge adjacent texts with same marks', () => {
      const children: SlateNode[] = [
        { text: openTag, marks: [] },
        { text: 'Netlify', marks: [] },
        { text: closeTag, marks: [] },
      ];

      expect(mergeAdjacentTexts(children)).toEqual([
        {
          text: `${openTag}Netlify${closeTag}`,
          marks: [],
        },
      ]);
    });

    it('should not merge adjacent texts with different marks', () => {
      const children: SlateNode[] = [
        { text: openTag, marks: [] },
        { text: 'Netlify', marks: [{ type: 'bold' }] },
        { text: closeTag, marks: [] },
      ];

      expect(mergeAdjacentTexts(children)).toEqual(children);
    });

    it('should handle mixed children array', () => {
      const children: SlateNode[] = [
        { type: 'a' },
        { text: openTag, marks: [] },
        { text: 'Netlify', marks: [] },
        { text: closeTag, marks: [] },
        { type: 'a' },
        { text: openTag, marks: [] },
        { text: 'Netlify', marks: [{ type: 'bold' }] },
        { text: closeTag, marks: [] },
        { text: openTag, marks: [] },
        { type: 'a' },
        { text: closeTag, marks: [] },
      ];

      expect(mergeAdjacentTexts(children)).toEqual([
        { type: 'a' },
        {
          text: `${openTag}Netlify${closeTag}`,
          marks: [],
        },
        { type: 'a' },
        { text: openTag, marks: [] },
        { text: 'Netlify', marks: [{ type: 'bold' }] },
        {
          text: `${closeTag}${openTag}`,
          marks: [],
        },
        { type: 'a' },
        { text: closeTag, marks: [] },
      ]);
    });
  });
});
