import styled from '@emotion/styled';
import React from 'react';

import { colors, lengths } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Composable card surface used across LaikaDashboard, LaikaAuthenticationPage,
 * and (future) settings/onboarding screens. The default surface has a soft
 * border + drop shadow on hover; pass `interactive={false}` for a static panel.
 */

const Surface = styled('article', { shouldForwardProp: laikaShouldForwardProp })<{
  $interactive?: boolean,
  $padding?: string,
}>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: ${({ $padding }) => $padding ?? '20px'};
  border-radius: ${lengths.borderRadius};
  border: 1px solid ${colors.textFieldBorder};
  background-color: ${colors.foreground};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  box-sizing: border-box;

  ${({ $interactive }) =>
  $interactive === false
    ? ''
    : `&:hover {
          border-color: ${colors.active};
          box-shadow: var(--laika-shadow-soft, 0 6px 18px rgba(15, 23, 42, 0.06));
        }`}
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textLead};
`;

const Body = styled.div`
  margin: 0;
  flex: 1 1 auto;
  font-size: 14px;
  color: ${colors.controlLabel};
  line-height: 1.5;
`;

const Footer = styled.footer`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: auto;
`;

export interface LaikaCardProps extends React.HTMLAttributes<HTMLElement> {
  interactive?: boolean;
  padding?: string;
  children?: React.ReactNode;
}

function LaikaCard({ interactive, padding, children, ...rest }: LaikaCardProps) {
  return (
    <Surface $interactive={interactive} $padding={padding} {...rest}>
      {children}
    </Surface>
  );
}

LaikaCard.Header = Header;
LaikaCard.Title = Title;
LaikaCard.Body = Body;
LaikaCard.Footer = Footer;

export default LaikaCard;
