import styled from '@emotion/styled';
import React from 'react';

import { useOnlineStatus } from '@/core/hooks/useOnlineStatus';
import { colors } from '@/ui/default/index';

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: ${colors.warnText};
  background-color: ${colors.warnBackground};
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex: none;
`;

/**
 * App-shell offline indicator (DCMS-1993). Renders nothing while
 * `navigator.onLine` reports connectivity; surfaces a small badge in the
 * header once the browser goes offline so users editing content know their
 * changes may not be syncing (the app shell itself stays usable thanks to
 * the service-worker cache registered in `core/serviceWorker`).
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <Badge className={className} role="status" aria-live="polite" data-testid="offline-indicator">
      <Dot aria-hidden="true" />
      Offline
    </Badge>
  );
}

export default OfflineIndicator;
