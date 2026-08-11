import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableNode,
  TableCellHeaderStates,
} from '@lexical/table';
import { $createParagraphNode, $createTextNode, $getRoot, $isTextNode } from 'lexical';
import { describe, expect, it } from 'vitest';

import { createHeadlessEditor } from '@/lib/richtext/lexical/headlessEditor';
import { TABLE } from '@/ui/editor/transformers/table-transformer';

describe('TABLE transformer', () => {
  describe('regExp', () => {
    it.each(['|a|b|', '| a | b |', '|  |'])('matches %j', input => {
      expect(TABLE.regExp.test(input)).toBe(true);
    });

    it.each(['not a table row', 'a | b', '', '|missing end pipe'])(
      'does not match %j',
      input => {
        expect(TABLE.regExp.test(input)).toBe(false);
      },
    );
  });

  describe('export', () => {
    it('renders a table node with a header row as markdown', () => {
      const editor = createHeadlessEditor();

      let output: string | null = null;
      editor.update(
        () => {
          const table = $createTableNode();

          const headerRow = $createTableRowNode();
          const headerCell1 = $createTableCellNode(TableCellHeaderStates.ROW);
          headerCell1.append($createParagraphNode().append($createTextNode('Name')));
          const headerCell2 = $createTableCellNode(TableCellHeaderStates.ROW);
          headerCell2.append($createParagraphNode().append($createTextNode('Age')));
          headerRow.append(headerCell1, headerCell2);

          const dataRow = $createTableRowNode();
          const dataCell1 = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
          dataCell1.append($createParagraphNode().append($createTextNode('Ada')));
          const dataCell2 = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
          dataCell2.append($createParagraphNode().append($createTextNode('30')));
          dataRow.append(dataCell1, dataCell2);

          table.append(headerRow, dataRow);
          $getRoot().append(table);

          output = TABLE.export(table, () => '');
        },
        { discrete: true },
      );

      expect(output).toBe(
        [
          '| Name | Age |',
          '| --- | --- |',
          '| Ada | 30 |',
        ].join('\n'),
      );
    });

    it('returns null for a non-table node', () => {
      const editor = createHeadlessEditor();

      let output: string | null = null;
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          $getRoot().append(paragraph);
          output = TABLE.export(paragraph, () => '');
        },
        { discrete: true },
      );

      expect(output).toBeNull();
    });
  });

  // Cell content still goes through the legacy Lexical
  // `$convertFromMarkdownString`/`$convertToMarkdownString` transformer-list
  // API (see the file-header comment in table-transformer.ts) because this
  // transformer only fires for live markdown-typing shortcuts, not document
  // persistence. These cases cover that path directly: typing a table row
  // with inline markdown formatting must produce formatted cell content, and
  // exporting it back must reproduce the same markdown.
  describe('replace (markdown-typing-shortcut cell content)', () => {
    it('parses inline formatting inside cells and round-trips it on export', () => {
      const editor = createHeadlessEditor();

      let table: ReturnType<typeof $createTableNode> | null = null;
      editor.update(
        () => {
    const line = '|**Bold**|plain|';
          const paragraph = $createParagraphNode();
          $getRoot().append(paragraph);

          const match = /^(?:\|)(.+)(?:\|)\s?$/.exec(line);
          if (!match) throw new Error('line did not match TABLE_ROW_REG_EXP');

          TABLE.replace(paragraph, [], match, false);

          const node = $getRoot().getFirstChild();
          if (!$isTableNode(node)) throw new Error('expected a table node');
          table = node;
        },
        { discrete: true },
      );

      expect(table).not.toBeNull();

      editor.update(
        () => {
          const row = table!.getFirstChild();
          if (!row) throw new Error('expected a row');
          const [boldCell] = row.getChildren();

          // Walk into the cell to find the bold text node.
          const paragraph = boldCell.getChildren()[0];
          const textNode = paragraph?.getChildren?.()[0];
          if (!$isTextNode(textNode)) throw new Error('expected a text node');
          expect(textNode.hasFormat('bold')).toBe(true);
          expect(textNode.getTextContent()).toBe('Bold');
        },
        { discrete: true },
      );

      let output: string | null = null;
      editor.update(
        () => {
          output = TABLE.export(table!, () => '');
        },
        { discrete: true },
      );

      expect(output).toBe('| **Bold** | plain |');
    });

    it('preserves escaped newlines inside a cell on import', () => {
      const editor = createHeadlessEditor();

      let table: ReturnType<typeof $createTableNode> | null = null;
      editor.update(
        () => {
          const line = '|line one\\nline two|b|';
          const paragraph = $createParagraphNode();
          $getRoot().append(paragraph);

          const match = /^(?:\|)(.+)(?:\|)\s?$/.exec(line);
          if (!match) throw new Error('line did not match TABLE_ROW_REG_EXP');

          TABLE.replace(paragraph, [], match, false);

          const node = $getRoot().getFirstChild();
          if (!$isTableNode(node)) throw new Error('expected a table node');
          table = node;
        },
        { discrete: true },
      );

      let output: string | null = null;
      editor.update(
        () => {
          output = TABLE.export(table!, () => '');
        },
        { discrete: true },
      );

      expect(output).toBe('| line one\\nline two | b |');
    });
  });
});
