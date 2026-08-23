import type { PlateElementProps } from 'platejs/react';

export default function TableRowElement({ children, attributes, nodeProps }: PlateElementProps) {
  return (
    <tr {...attributes} {...nodeProps}>
      {children}
    </tr>
  );
}
