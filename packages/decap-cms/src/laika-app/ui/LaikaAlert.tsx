import { css } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';

import { colors } from '@/ui/default/index';
import { laikaShouldForwardProp } from '@/ui/styled';

export type LaikaAlertIntent = 'info' | 'success' | 'warning' | 'danger';

const intentStyles: Record<LaikaAlertIntent, ReturnType<typeof css>> = {
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
};

const Alert = styled('div', { shouldForwardProp: laikaShouldForwardProp })<{
  $intent: LaikaAlertIntent,
}>`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  ${({ $intent }) => intentStyles[$intent]};
`;

export interface LaikaAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  intent?: LaikaAlertIntent;
}

const LaikaAlert = React.forwardRef<HTMLDivElement, LaikaAlertProps>(
  function LaikaAlert({ intent = 'info', role, children, ...rest }, ref) {
    const liveRegionRole = role ?? (intent === 'warning' || intent === 'danger' ? 'alert' : 'status');
    return (
      <Alert ref={ref} $intent={intent} data-intent={intent} role={liveRegionRole} {...rest}>
        {children}
      </Alert>
    );
  },
);

export default LaikaAlert;
