/**
 * Vendored port of `react-topbar-progress-indicator` (MoOx), MIT licensed.
 * Upstream: https://github.com/MoOx/react-topbar-progress-indicator
 * Vendored per https://github.com/laikacms/decap-cms/issues/665 (upstream dormant since 2023-01-09).
 */
import React from 'react';
import topbarLib from 'topbar';

type Topbar = {
  show: () => void;
  hide: () => void;
  config: (options: Record<string, unknown>) => void;
};

const noopTopbar: Topbar = {
  show: () => undefined,
  hide: () => undefined,
  config: () => undefined,
};

const topbar: Topbar = typeof window === 'undefined' ? noopTopbar : topbarLib;

let semaphore = 0;

type TopBarProgressProps = {
  topbar?: Topbar;
};

function getTopBar(props: TopBarProgressProps) {
  return props.topbar || topbar;
}

function TopBarProgress(props: TopBarProgressProps) {
  React.useEffect(() => {
    if (semaphore === 0) {
      getTopBar(props).show();
    }
    semaphore++;
    return () => {
      semaphore--;
      if (semaphore === 0) {
        getTopBar(props).hide();
      }
    };
  }, []);
  return null;
}

TopBarProgress.config = topbar.config;

export default TopBarProgress;
