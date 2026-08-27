import type { PlateElementProps } from 'platejs/react';

export default function TableRowElement({ children, attributes }: PlateElementProps) {
  return (
    <tr {...attributes}>
      {children}
    </tr>
  );
}
