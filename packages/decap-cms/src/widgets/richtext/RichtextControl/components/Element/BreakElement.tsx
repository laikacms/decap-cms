import { PlateElement } from 'platejs/react';

import type { PlateElementProps } from 'platejs/react';

export default function BreakElement(props: PlateElementProps) {
  return (
    <PlateElement as="span" contentEditable={false} {...props}>
      <br />
    </PlateElement>
  );
}
