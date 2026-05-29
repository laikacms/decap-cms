// @ts-nocheck -- ported from upstream JS; strict typing is follow-up work
import React from 'react';

function TableRowElement({ children, attributes, nodeProps }) {
  return (
    <tr {...attributes} {...nodeProps}>
      {children}
    </tr>
  );
}

export default TableRowElement;