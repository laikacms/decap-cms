import { $createHorizontalRuleNode, HorizontalRuleNode } from '@lexical/extension';
import { $createParagraphNode, $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { HR } from '@/lib/widgets/editor/transformers/hr-transformer';

describe('HR transformer', () => {
  describe('regExp', () => {
    it.each(['---', '***', '___', '--- ', '*** ', '___ '])(
      'matches %j',
      input => {
        expect(HR.regExp.test(input)).toBe(true);
      },
    );

    it.each(['----', '- - -', '**', 'not a rule', '  ---'])(
      'does not match %j',
      input => {
        expect(HR.regExp.test(input)).toBe(false);
      },
    );
  });

  describe('export', () => {
    it('renders a horizontal rule node as ***', () => {
      const editor = createHeadlessEditor([HorizontalRuleNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const node = $createHorizontalRuleNode();
          output = HR.export(node, () => '');
        },
        { discrete: true },
      );

      expect(output).toBe('***');
    });

    it('returns null for a non-horizontal-rule node', () => {
      const editor = createHeadlessEditor([HorizontalRuleNode]);

      let output: string | null = null;
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          $getRoot().append(paragraph);
          output = HR.export(paragraph, () => '');
        },
        { discrete: true },
      );

      expect(output).toBeNull();
    });
  });
});
