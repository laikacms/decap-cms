import styled from '@emotion/styled';
import { PlateElement } from 'platejs/react';

import type { PlateElementProps } from 'platejs/react';

export type HeadingVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingVariants: Record<HeadingVariant, { fontSize: string, marginTop: string }> = {
  h1: { fontSize: '32px', marginTop: '16px' },
  h2: { fontSize: '24px', marginTop: '12px' },
  h3: { fontSize: '20px', marginTop: '0' },
  h4: { fontSize: '18px', marginTop: '8px' },
  h5: { fontSize: '16px', marginTop: '8px' },
  h6: { fontSize: '16px', marginTop: '8px' },
};

interface StyledHeadingProps {
  variant: HeadingVariant;
  isFirstBlock: boolean;
}

const StyledHeading = styled(PlateElement)<StyledHeadingProps>`
  font-weight: 700;
  line-height: 1;
  margin-top: ${props => (props.isFirstBlock ? '0' : headingVariants[props.variant].marginTop)};
  font-size: ${props => headingVariants[props.variant].fontSize};
`;

interface HeadingElementProps extends PlateElementProps {
  variant?: HeadingVariant | undefined;
}

export default function HeadingElement({
  variant = 'h1',
  children,
  ...props
}: HeadingElementProps) {
  const { element, editor } = props;
  const isFirstBlock = element === editor.children[0];

  return (
    <StyledHeading as={variant} variant={variant} isFirstBlock={isFirstBlock} {...props}>
      {children}
    </StyledHeading>
  );
}
