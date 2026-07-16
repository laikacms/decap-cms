import { $createTextNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { EMOJI } from '@/ui/editor/transformers/emoji-transformer';

describe('EMOJI transformer', () => {
  describe('regExp', () => {
    it.each([':smile:', ':thumbs_up:', ':100:', ':a_b_c:'])(
      'matches %j',
      input => {
        expect(EMOJI.regExp.test(input)).toBe(true);
      },
    );

    it.each([':Smile:', ':smile', 'smile:', 'no colons here', '::'])(
      'does not match %j',
      input => {
        expect(EMOJI.regExp.test(input)).toBe(false);
      },
    );

    it('captures the emoji alias', () => {
      const match = ':smile:'.match(EMOJI.regExp);
      expect(match?.[1]).toBe('smile');
    });
  });

  describe('export', () => {
    it('always returns null (emoji is exported as plain text)', () => {
      const editor = createHeadlessEditor();

      let output: string | null = null;
      editor.update(
        () => {
          const textNode = $createTextNode('smiley face');
          output = EMOJI.export!(textNode, () => '', node => node.getTextContent());
        },
        { discrete: true },
      );

      expect(output).toBeNull();
    });
  });
});
