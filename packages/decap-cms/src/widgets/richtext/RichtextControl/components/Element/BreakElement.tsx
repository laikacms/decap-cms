import { PlateElement } from 'platejs/react';

import type { PlateElementProps } from 'platejs/react';

export default function BreakElement(props: PlateElementProps) {
  const { attributes, ...rest } = props;
  return (
    <PlateElement as="span" attributes={{ ...attributes, contentEditable: false }} {...rest}>
      <br />
    </PlateElement>
  );
}
