import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension';
import { $createParagraphNode, $getRoot, $isParagraphNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { HR } from '@/ui/editor/transformers/hr-transformer';

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

  describe('replace', () => {
    it('inserts the rule before the matched paragraph when nothing follows it, keeping the paragraph as a landing spot', () => {
      const editor = createHeadlessEditor([HorizontalRuleNode]);

      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          HR.replace(paragraph, [], ['---'], false);

          const children = root.getChildren();
          expect(children).toHaveLength(2);
          expect($isHorizontalRuleNode(children[0])).toBe(true);
          expect($isParagraphNode(children[1])).toBe(true);
          expect(children[1]).toBe(paragraph);
        },
        { discrete: true },
      );
    });

    it('replaces the matched paragraph outright when a next sibling already exists', () => {
      const editor = createHeadlessEditor([HorizontalRuleNode]);

      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const nextParagraph = $createParagraphNode();
          root.append(paragraph, nextParagraph);

          HR.replace(paragraph, [], ['---'], false);

          const children = root.getChildren();
          expect(children).toHaveLength(2);
          expect($isHorizontalRuleNode(children[0])).toBe(true);
          expect(children[1]).toBe(nextParagraph);
          expect(paragraph.isAttached()).toBe(false);
        },
        { discrete: true },
      );
    });

    it('behaves the same regardless of the isImport argument', () => {
      const editor = createHeadlessEditor([HorizontalRuleNode]);

      editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          HR.replace(paragraph, [], ['---'], true);

          const children = root.getChildren();
          expect(children).toHaveLength(2);
          expect($isHorizontalRuleNode(children[0])).toBe(true);
          expect(children[1]).toBe(paragraph);
        },
        { discrete: true },
      );
    });
  });
});
