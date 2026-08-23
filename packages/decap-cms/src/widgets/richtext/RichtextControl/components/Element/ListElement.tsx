import styled from '@emotion/styled';
import { PlateElement } from 'platejs/react';

import type { PlateElementProps } from 'platejs/react';

export type ListVariant = 'ul' | 'ol' | 'li';

const StyledListItem = styled.li`
  margin-bottom: 16px;
  padding-left: 30px;
`;

const StyledList = styled.ul`
  margin-top: 8px;
  margin-bottom: 8px;
`;

interface ListElementProps extends PlateElementProps {
  variant: ListVariant;
}

export default function ListElement({ children, variant, ...props }: ListElementProps) {
  // `li` is the wrapper Plate emits for a list *container* in this schema, so
  // it gets the list styling; `ul`/`ol` get the item styling. This mirrors the
  // node types produced by the markdown deserializer.
  const Element = variant === 'li' ? StyledList : StyledListItem;

  return (
    <PlateElement asChild {...props}>
      <Element as={variant}>{children}</Element>
    </PlateElement>
  );
}
