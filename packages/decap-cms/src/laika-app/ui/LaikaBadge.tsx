import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

/**
 * Compact pill used for counts and status labels (entry counts in the sidebar,
 * workflow status badges, etc.). Five intents map onto existing Decap status
 * tokens so badges automatically follow the active theme.
 */

export type LaikaBadgeIntent = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'draft';

const intentStyles: Record<LaikaBadgeIntent, ReturnType<typeof css>> = {
  neutral: css`
    background-color: ${colors.activeBackground};
    color: ${colors.controlLabel};
  `,
  info: css`
    background-color: ${colors.infoBackground};
    color: ${colors.infoText};
  `,
  success: css`
    background-color: ${colors.successBackground};
    color: ${colors.successText};
  `,
  warning: css`
    background-color: ${colors.warnBackground};
    color: ${colors.warnText};
  `,
  danger: css`
    background-color: ${colors.errorBackground};
    color: ${colors.errorText};
  `,
  draft: css`
    background-color: ${colors.statusDraftBackground};
    color: ${colors.statusDraftText};
  `,
};

const Pill = styled('span', { shouldForwardProp: laikaShouldForwardProp })<{
  $intent: LaikaBadgeIntent,
}>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  line-height: 1.4;
  ${({ $intent }) => intentStyles[$intent]};
`;

export interface LaikaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: LaikaBadgeIntent;
  children?: React.ReactNode;
}

function LaikaBadge({ intent = 'neutral', children, ...rest }: LaikaBadgeProps) {
  return (
    <Pill $intent={intent} {...rest}>
      {children}
    </Pill>
  );
}

export default LaikaBadge;
