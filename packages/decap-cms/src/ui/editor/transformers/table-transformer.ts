import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  type ElementTransformer,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { $isParagraphNode, $isTextNode, type LexicalNode } from 'lexical';

// import { EMOJI } from "@/registry/new-york-v4/editor/transformers/markdown-emoji-transformer"
import { HR } from './hr-transformer';
import { IMAGE } from './image-transformer';

// import { TWEET } from "@/registry/new-york-v4/editor/transformers/markdown-tweet-transformer"

// This file is registered ONLY as a Lexical `MarkdownShortcutsExtension`
// transformer (see Editor.tsx's `withTables` branch) — it drives live
// markdown-typing shortcuts inside the contentEditable (e.g. typing
// `| a | b |` + Enter). It is NOT part of the document persistence path:
// `lib/richtext/bridge/{lexicalToPortableText,portableTextToLexical}.ts`
// convert Lexical tables to/from the PT `{_type:'table', ...}` shape using
// the same `textBlockToLexical`/`convertBlock` machinery as every other
// block, which in turn is what round-trips through the registered
// `formats.markdown` codecs (`resolveBlockCodecs`/`BlockFormatCodec`). This
// confirms the tech-debt.md note: this file's `$convertTo/FromMarkdownString`
// calls are typing-shortcut-only and no longer touch serialization.
//
// `$convertToMarkdownString`/`$convertFromMarkdownString` remain here (cell
// content only) because `BlockFormatCodec` operates one layer up — it maps a
// Portable Text block's *data* to/from a markdown *string* for the whole
// document mapper (`markdown-mapper.ts`), not a live Lexical node subtree
// mid-keystroke. There is no codec hook into the Lexical
// `MarkdownShortcutsExtension` transformer pipeline itself, so converting a
// table cell's Lexical children to a markdown string (for export) or parsing
// typed markdown into cell children (for replace) has to go through
// Lexical's own transformer-list API, same as every other
// `ElementTransformer` in this directory (HR, IMAGE, CHECK_LIST, ...).
// Migrating this would require a wider redesign of the markdown-shortcut
// pipeline to be codec-aware, not just a table-transformer change.

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

const OTHER_MARKDOWN_TRANSFORMERS = [
  HR,
  IMAGE,
  // EMOJI,
  // TWEET,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];

    for (const row of node.getChildren()) {
      const rowOutput: string[] = [];
      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        // It's TableCellNode so it's just to make flow happy
        if ($isTableCellNode(cell)) {
          rowOutput.push(
            $convertToMarkdownString(OTHER_MARKDOWN_TRANSFORMERS, cell).replace(
              /\n/g,
              '\\n',
            ),
          );
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(_ => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    // Header row
    if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) {
        return;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) {
        return;
      }

      // Add header state to row cells
      lastRow.getChildren().forEach(cell => {
        if (!$isTableCellNode(cell)) {
          return;
        }
        cell.setHeaderStyles(
          TableCellHeaderStates.ROW,
          TableCellHeaderStates.ROW,
        );
      });

      // Remove line
      parentNode.remove();
      return;
    }

    const matchCells = mapToTableCells(match[0]);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < cells.length ? cells[i] : $createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();
    if (
      $isTableNode(previousSibling)
      && getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element',
};

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const $createTableCell = (textContent: string): TableCellNode => {
  textContent = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(textContent, OTHER_MARKDOWN_TRANSFORMERS, cell);
  return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].split('|').map(text => $createTableCell(text));
};
