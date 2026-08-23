import { useLink } from '@platejs/link/react';
import { PlateElement } from 'platejs/react';

import type { PlateElementProps } from 'platejs/react';

export default function LinkElement({ children, element, ...rest }: PlateElementProps) {
  const { props: linkProps } = useLink({ element });

  return (
    <PlateElement
      as="a"
      element={element}
      style={{
        textDecoration: 'underline',
        fontSize: 'inherit',
        maxWidth: '100%',
        fontWeight: 'inherit',
      }}
      {...linkProps}
      {...rest}
    >
      {children}
    </PlateElement>
  );
}
