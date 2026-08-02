import React from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { translate } from 'react-polyglot';
import { Icon, colors } from 'decap-cms-ui-default';

import { useOnlineStatus } from '../../lib/useOnlineStatus';

const OfflineBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  margin: 0 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: ${colors.warnText};
  background-color: ${colors.warnBackground};
  white-space: nowrap;
`;

/**
 * Shows a small badge in the app header when the browser reports no network
 * connection (DCMS-1420, MVP slice of #1420). Renders nothing while online.
 */
export function OfflineIndicator({ t }) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <OfflineBadge data-testid="offline-indicator" role="status">
      <Icon type="info-circle" size="xsmall" />
      {t('app.header.offline')}
    </OfflineBadge>
  );
}

OfflineIndicator.propTypes = {
  t: PropTypes.func.isRequired,
};

export default translate()(OfflineIndicator);
