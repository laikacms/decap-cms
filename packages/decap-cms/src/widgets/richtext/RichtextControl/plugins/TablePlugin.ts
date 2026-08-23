import { createSlatePlugin } from 'platejs';
import { toPlatePlugin } from 'platejs/react';

import TableCellElement from '@/widgets/richtext/RichtextControl/components/Element/TableCellElement';
import TableElement from '@/widgets/richtext/RichtextControl/components/Element/TableElement';
import TableRowElement from '@/widgets/richtext/RichtextControl/components/Element/TableRowElement';

const TablePlugin = toPlatePlugin(
  createSlatePlugin({
    key: 'table',
    node: {
      isElement: true,
      component: TableElement,
    },
  }),
);

const TableRowPlugin = toPlatePlugin(
  createSlatePlugin({
    key: 'table-row',
    node: {
      isElement: true,
      component: TableRowElement,
    },
  }),
);

const TableCellPlugin = toPlatePlugin(
  createSlatePlugin({
    key: 'table-cell',
    node: {
      isElement: true,
      component: TableCellElement,
    },
  }),
);

export { TableCellPlugin, TablePlugin, TableRowPlugin };
