import { $createTableCellNode, $createTableNode, $createTableRowNode, TableCellHeaderStates } from '@lexical/table';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
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
});
