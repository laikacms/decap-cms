import { $createTextNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { $createImageNode, ImageNode } from '@/ui/editor/nodes/ImageNode';
import { IMAGE } from '@/ui/editor/transformers/image-transformer';

describe('IMAGE transformer', () => {
  describe('regExp', () => {
    it.each([
      '![alt text](https://example.com/a.png)',
      '![](https://example.com/a.png)',
      '![alt](a.png)',
    ])('matches %j', input => {
      expect(IMAGE.regExp.test(input)).toBe(true);
    });

    it.each([
      'not an image',
      '[alt](https://example.com/a.png)',
      '![alt](https://example.com/a.png) trailing text',
      '![alt](open paren missing',
    ])('does not match %j', input => {
      expect(IMAGE.regExp.test(input)).toBe(false);
    });

    it('captures alt text and src', () => {
      const match = '![alt text](https://example.com/a.png)'.match(IMAGE.regExp);
      expect(match?.[1]).toBe('alt text');
      expect(match?.[2]).toBe('https://example.com/a.png');
    });
  });

  describe('importRegExp', () => {
    it('matches an image reference mid-line', () => {
      expect(IMAGE.importRegExp!.test('prefix ![alt](src.png) suffix')).toBe(true);
    });
  });

  describe('export', () => {
    it('renders an image node as markdown image syntax', () => {
      const editor = createHeadlessEditor([ImageNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const node = $createImageNode({ altText: 'a cat', src: 'cat.png' });
          output = IMAGE.export!(node, () => '', textNode => textNode.getTextContent());
        },
        { discrete: true },
      );

      expect(output).toBe('![a cat](cat.png)');
    });

    it('returns null for a non-image node', () => {
      const editor = createHeadlessEditor([ImageNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const textNode = $createTextNode('plain text');
          output = IMAGE.export!(textNode, () => '', node => node.getTextContent());
        },
        { discrete: true },
      );

      expect(output).toBeNull();
    });
  });
});
